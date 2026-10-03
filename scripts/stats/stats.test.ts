import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addBoard, emptyCounters, matchToRows, isRankedStandard, mergeCounters } from "./aggregate.ts";
import type { Platform } from "./regions.ts";
import { BudgetExceededError, type Clock, parseRateLimitHeader, RateLimiter, RiotClient } from "./riot.ts";
import { seedPlayers } from "./seed.ts";
import { FileBlobStore } from "./blob.ts";
import { R2BlobStore } from "./r2.ts";
import { comparePatches, namedExtras, runStamp, StatsStore } from "./state.ts";
import type { LeagueEntry, Match } from "./types.ts";

function fakeClock(start = 0): Clock & { time: number } {
  const clock = {
    time: start,
    now: () => clock.time,
    sleep: async (ms: number) => {
      clock.time += ms;
    },
  };
  return clock;
}

const match = (overrides: Partial<Match["info"]> = {}): Match => ({
  metadata: { match_id: "NA1_1" },
  info: {
    queue_id: 1100,
    game_version: "Version 16.19.713.4213 (Sep 24 2026/10:10:00) [PUBLIC] <Releases/16.19>",
    game_datetime: 1_790_000_000_000,
    tft_set_number: 18,
    tft_game_type: "standard",
    participants: [
      {
        placement: 1,
        level: 9,
        traits: [
          { name: "TFT18_Blossom", num_units: 5, tier_current: 2 },
          { name: "TFT18_Fae", num_units: 1, tier_current: 0 },
        ],
        units: [
          { character_id: "TFT18_Ahri", tier: 2, itemNames: ["TFT_Item_BlueBuff", "TFT_Item_BlueBuff"] },
          { character_id: "TFT18_Ahri", tier: 1 },
        ],
      },
      {
        placement: 6,
        level: 8,
        last_round: 27,
        total_damage_to_players: 40,
        companion: { content_ID: "ossia-1" },
        traits: [],
        units: [{ character_id: "TFT18_Ahri", tier: 1 }],
      },
    ],
    ...overrides,
  },
});

describe("RateLimiter", () => {
  it("waits for the tightest window and blocks after a 429", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(
      [
        [2, 1],
        [3, 10],
      ],
      clock,
    );
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire(); // 1s window full → waits ~1s
    expect(clock.time).toBeGreaterThanOrEqual(1000);
    await limiter.acquire(); // 10s window full → waits until the first hit expires
    expect(clock.time).toBeGreaterThanOrEqual(10_000);

    limiter.block(clock.time + 5000);
    const before = clock.time;
    await limiter.acquire();
    expect(clock.time - before).toBeGreaterThanOrEqual(5000);
  });

  it("refuses to wait past the deadline", async () => {
    const limiter = new RateLimiter([[1, 60]], fakeClock());
    await limiter.acquire(1000);
    await expect(limiter.acquire(1000)).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("parses Riot rate limit headers", () => {
    expect(parseRateLimitHeader("20:1,100:120")).toEqual([
      [20, 1],
      [100, 120],
    ]);
    expect(parseRateLimitHeader(null)).toEqual([]);
  });
});

describe("RiotClient", () => {
  it("retries after a 429 using Retry-After and returns null for 404", async () => {
    const clock = fakeClock();
    const responses = [
      new Response(null, { status: 429, headers: { "Retry-After": "3" } }),
      new Response(JSON.stringify(["NA1_1"]), { status: 200, headers: { "X-App-Rate-Limit": "20:1,100:120" } }),
      new Response(null, { status: 404 }),
    ];
    const client = new RiotClient({ apiKey: "key", clock, fetch: async () => responses.shift()! });

    expect(await client.matchIds("americas", "puuid", 0)).toEqual(["NA1_1"]);
    expect(clock.time).toBeGreaterThanOrEqual(3000);
    expect(await client.match("americas", "NA1_404")).toBeNull();
  });
});

describe("RiotClient network errors", () => {
  it("retries connection failures with backoff", async () => {
    const clock = fakeClock();
    let calls = 0;
    const client = new RiotClient({
      apiKey: "key",
      clock,
      fetch: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("fetch failed");
        return new Response(JSON.stringify([]), { status: 200 });
      },
    });
    expect(await client.matchIds("americas", "puuid", 0)).toEqual([]);
    expect(calls).toBe(2);
  });
});

describe("seedPlayers", () => {
  const platform: Platform = { id: "na1", region: "americas", poolSize: 3 };
  const entries = (prefix: string, count: number): LeagueEntry[] =>
    Array.from({ length: count }, (_, i) => ({ puuid: `${prefix}${i}` }));

  function fakeClient(league: Record<string, LeagueEntry[]>) {
    return {
      apexLeague: async (_: string, tier: string) => ({ tier, entries: league[tier] ?? [] }),
      leagueEntries: async (_: string, tier: string, division: string, page: number) =>
        page === 1 ? (league[`${tier}-${division}`] ?? []) : [],
    } as unknown as RiotClient;
  }

  it("walks below Master when the apex ladder is empty, as it is right after a set launch", async () => {
    const client = fakeClient({ "DIAMOND-II": entries("d", 1), "EMERALD-I": entries("e", 5) });
    const players = await seedPlayers(client, platform, "gold", [{ puuid: "e0", bucket: "gold", lastCrawledAt: 42 }]);
    expect(players.map(({ puuid, bucket }) => [puuid, bucket])).toEqual([
      ["d0", "diamond"],
      ["e0", "emerald"],
      ["e1", "emerald"],
    ]);
    expect(players[1]?.lastCrawledAt).toBe(42);
  });

  it("stops at the minimum tier and skips inactive players", async () => {
    const client = fakeClient({
      challenger: [{ puuid: "c0" }, { puuid: "c1", inactive: true }],
      "EMERALD-I": entries("e", 5),
    });
    const players = await seedPlayers(client, platform, "diamond", []);
    expect(players.map((player) => player.puuid)).toEqual(["c0"]);
  });
});

describe("aggregation", () => {
  it("keeps only standard ranked games", () => {
    expect(isRankedStandard(match())).toBe(true);
    expect(isRankedStandard(match({ queue_id: 1090 }))).toBe(false);
    expect(isRankedStandard(match({ tft_game_type: "pairs" }))).toBe(false);
  });

  it("stores one row per player with only active traits", () => {
    expect(matchToRows(match(), "diamond")).toEqual([
      [
        "NA1_1",
        1_790_000_000,
        "diamond",
        1,
        9,
        [
          ["TFT18_Ahri", 2, ["TFT_Item_BlueBuff", "TFT_Item_BlueBuff"]],
          ["TFT18_Ahri", 1, []],
        ],
        [["TFT18_Blossom", 2, 5]],
      ],
      [
        "NA1_1",
        1_790_000_000,
        "diamond",
        6,
        8,
        [["TFT18_Ahri", 1, []]],
        [],
        { lastRound: 27, damage: 40, companion: "ossia-1" },
      ],
    ]);
  });

  it("counts units and traits per board and items per equipped instance", () => {
    const counters = emptyCounters();
    for (const row of matchToRows(match(), "diamond")) addBoard(counters, row);
    expect(counters.matches).toBe(1);
    expect(counters.boards).toBe(2);
    expect(counters.units["TFT18_Ahri"]).toEqual([2, 7, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0]);
    expect(counters.unitStars["TFT18_Ahri|1"]!.slice(0, 4)).toEqual([2, 7, 1, 1]);
    expect(counters.items["TFT_Item_BlueBuff"]).toEqual([2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(counters.unitItems["TFT18_Ahri|TFT_Item_BlueBuff"]!.slice(0, 4)).toEqual([2, 2, 2, 2]);
    expect(counters.traits).toEqual({ "TFT18_Blossom|2": [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] });
  });

  it("merges counters by summing", () => {
    const a = emptyCounters();
    const b = emptyCounters();
    for (const row of matchToRows(match(), "diamond")) {
      addBoard(a, row);
      addBoard(b, row);
    }
    const merged = mergeCounters(emptyCounters(), a);
    mergeCounters(merged, b);
    expect(merged.matches).toBe(2);
    expect(merged.units["TFT18_Ahri"]).toEqual([4, 14, 2, 2, 2, 0, 0, 0, 0, 2, 0, 0]);
  });
});

describe("stored rows", () => {
  it("reads rows that kept the extra fields positionally into the named form", () => {
    const core = ["NA1_1", 1, "diamond", 3, 8, [], []];
    expect(namedExtras([...core, 27, 40, "ossia-1"])).toEqual([
      ...core,
      { lastRound: 27, damage: 40, companion: "ossia-1" },
    ]);
    expect(namedExtras([...core, 27, 40, ""])).toEqual([...core, { lastRound: 27, damage: 40 }]);
    expect(namedExtras([...core, { lastRound: 30 }])).toEqual([...core, { lastRound: 30 }]);
    expect(namedExtras(core)).toEqual(core);
  });
});

describe("StatsStore", () => {
  let root: string | undefined;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("keeps rank floor summaries apart from the default ones", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    const summary = (patch: string, matches: number) => JSON.stringify({ patch, matches, status: "ready" });
    await store.putSummary(18, "18.3b", summary("18.3b", 3000));
    await store.putSummary(18, "18.3", summary("18.3", 2500));
    await store.putSummary(18, "18.3b", summary("18.3b", 2100), "master");
    expect((await store.summaries(18)).map((entry) => [entry.patch, entry.matches])).toEqual([
      ["18.3", 2500],
      ["18.3b", 3000],
    ]);
    expect((await store.summaries(18, "master")).map((entry) => entry.matches)).toEqual([2100]);
  });

  it("round-trips state and boards, and prunes old patches and match IDs", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    await store.savePlatformState("na1", {
      seededAt: "2026-09-30T00:00:00Z",
      players: [{ puuid: "p", bucket: "diamond" }],
    });
    expect((await store.platformState("na1")).players).toHaveLength(1);
    expect(await store.platformState("kr")).toEqual({ players: [] });

    await store.saveSeen(
      "na1",
      new Map([
        ["NA1_old", 10],
        ["NA1_new", 100],
      ]),
      50,
    );
    expect([...(await store.seen("na1")).keys()]).toEqual(["NA1_new"]);

    const rows = matchToRows(match(), "diamond");
    for (const patch of ["16.9", "16.10", "16.11"]) {
      await store.appendBoards(18, patch, "20261001T120000Z-americas", rows);
    }
    await store.putSummary(18, "16.9", "{}");
    const chunks = await store.listBoardChunks();
    expect(chunks.find((chunk) => chunk.patch === "16.11")).toMatchObject({
      key: "boards/set18/16.11/20261001T120000Z-americas.jsonl.gz",
      set: 18,
      name: "20261001T120000Z-americas",
    });
    expect(await store.readBoards(chunks[0]!)).toEqual(rows);

    await store.pruneBoards(2);
    expect((await store.listBoardChunks()).map((chunk) => chunk.patch).sort(comparePatches)).toEqual([
      "16.10",
      "16.11",
    ]);
    expect(await store.blobs.get("summaries/set18/16.9.json")).not.toBeNull();
  });

  it("orders TFT patch labels, b patches included", () => {
    expect(["18.10", "18.3b", "17.9", "18.3", "18.4"].sort(comparePatches)).toEqual([
      "17.9",
      "18.3",
      "18.3b",
      "18.4",
      "18.10",
    ]);
  });

  it("stamps runs so chunk names sort chronologically", () => {
    expect(runStamp(new Date("2026-10-01T09:05:03.123Z"))).toBe("20261001T090503Z");
  });
});

describe("R2BlobStore", () => {
  const config = { accountId: "acct", accessKeyId: "id", secretAccessKey: "secret", bucket: "tft" };

  it("signs requests against the bucket and follows list pagination", async () => {
    const requests: Request[] = [];
    const pages = [
      "<ListBucketResult><Key>boards/a&amp;b.gz</Key><IsTruncated>true</IsTruncated><NextContinuationToken>t2</NextContinuationToken></ListBucketResult>",
      "<ListBucketResult><Key>boards/c.gz</Key><IsTruncated>false</IsTruncated></ListBucketResult>",
    ];
    const store = new R2BlobStore(config, async (input) => {
      const request = input as Request;
      requests.push(request);
      if (request.method === "GET" && new URL(request.url).searchParams.has("list-type")) {
        return new Response(pages.shift());
      }
      return new Response(null, { status: request.method === "GET" ? 404 : 200 });
    });

    expect(await store.list("boards/")).toEqual(["boards/a&b.gz", "boards/c.gz"]);
    expect(new URL(requests[1]!.url).searchParams.get("continuation-token")).toBe("t2");
    expect(await store.get("state/na1.json")).toBeNull();
    await store.put("state/na1.json", "{}");

    const put = requests.at(-1)!;
    expect(put.url).toBe("https://acct.r2.cloudflarestorage.com/tft/state/na1.json");
    expect(put.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=id\//);
  });

  it("fails on client errors instead of retrying", async () => {
    let calls = 0;
    const store = new R2BlobStore(config, async () => {
      calls += 1;
      return new Response("denied", { status: 403 });
    });
    await expect(store.put("x", "y")).rejects.toThrow(/403/);
    expect(calls).toBe(1);
  });
});

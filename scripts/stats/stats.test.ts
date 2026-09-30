import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addMatch, emptyCounters, isRankedStandard, mergeCounters, patchFromGameVersion } from "./aggregate.ts";
import type { Platform } from "./regions.ts";
import { BudgetExceededError, type Clock, parseRateLimitHeader, RateLimiter, RiotClient } from "./riot.ts";
import { seedPlayers } from "./seed.ts";
import { comparePatches, StatsStore } from "./state.ts";
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
        traits: [
          { name: "TFT18_Blossom", num_units: 5, tier_current: 2 },
          { name: "TFT18_Fae", num_units: 1, tier_current: 0 },
        ],
        units: [
          { character_id: "TFT18_Ahri", tier: 2, itemNames: ["TFT_Item_BlueBuff", "TFT_Item_BlueBuff"] },
          { character_id: "TFT18_Ahri", tier: 1 },
        ],
      },
      { placement: 6, traits: [], units: [{ character_id: "TFT18_Ahri", tier: 1 }] },
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
  it("reads the patch from the game version and filters to ranked standard games", () => {
    expect(patchFromGameVersion(match().info.game_version)).toBe("16.19");
    expect(isRankedStandard(match())).toBe(true);
    expect(isRankedStandard(match({ queue_id: 1090 }))).toBe(false);
    expect(isRankedStandard(match({ tft_game_type: "pairs" }))).toBe(false);
  });

  it("counts units and traits per board and items per equipped instance", () => {
    const counters = emptyCounters();
    addMatch(counters, match());
    expect(counters.matches).toBe(1);
    expect(counters.boards).toBe(2);
    expect(counters.units["TFT18_Ahri"]).toEqual([2, 7, 1, 1]);
    expect(counters.unitStars["TFT18_Ahri|1"]).toEqual([2, 7, 1, 1]);
    expect(counters.items["TFT_Item_BlueBuff"]).toEqual([2, 2, 2, 2]);
    expect(counters.unitItems["TFT18_Ahri|TFT_Item_BlueBuff"]).toEqual([2, 2, 2, 2]);
    expect(counters.traits).toEqual({ "TFT18_Blossom|2": [1, 1, 1, 1] });
  });

  it("merges counters by summing", () => {
    const a = emptyCounters();
    const b = emptyCounters();
    addMatch(a, match());
    addMatch(b, match());
    const merged = mergeCounters(emptyCounters(), a);
    mergeCounters(merged, b);
    expect(merged.matches).toBe(2);
    expect(merged.units["TFT18_Ahri"]).toEqual([4, 14, 2, 2]);
  });
});

describe("StatsStore", () => {
  let root: string | undefined;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("round-trips state and prunes old patches and match IDs", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(root);
    await store.savePlatformState("na1", {
      seededAt: "2026-09-30T00:00:00Z",
      players: [{ puuid: "p", bucket: "diamond" }],
    });
    expect((await store.platformState("na1")).players).toHaveLength(1);

    await store.saveSeen(
      "na1",
      new Map([
        ["NA1_old", 10],
        ["NA1_new", 100],
      ]),
      50,
    );
    expect([...(await store.seen("na1")).keys()]).toEqual(["NA1_new"]);

    for (const patch of ["16.9", "16.10", "16.11"]) {
      await store.savePatchCounters({ set: 18, patch, updatedAt: "", buckets: {} });
    }
    await store.prunePatches(2);
    expect((await store.listPatchCounters()).map((entry) => entry.patch).sort(comparePatches)).toEqual([
      "16.10",
      "16.11",
    ]);
  });
});

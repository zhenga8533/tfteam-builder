import { describe, expect, it } from "vitest";
import type { LeagueEntry } from "../store/types.ts";
import type { Platform } from "./regions.ts";
import type { RiotClient } from "./riot.ts";
import { seedPlayers } from "./seed.ts";

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
  const bucketCounts = (players: { bucket: string }[]) =>
    Object.fromEntries(
      Object.entries(Object.groupBy(players, (player) => player.bucket)).map(([k, v]) => [k, v!.length]),
    );

  it("gives each tier its share of the pool", async () => {
    const client = fakeClient({
      challenger: entries("c", 50),
      "DIAMOND-I": entries("d", 50),
      "EMERALD-I": entries("e", 50),
    });
    const players = await seedPlayers(client, { ...platform, poolSize: 20 }, "gold", []);
    expect(bucketCounts(players)).toEqual({ master_plus: 8, diamond: 7, emerald: 5 });
  });

  it("passes space a thin tier can't fill down to the tiers below, then to Platinum as a fallback", async () => {
    const client = fakeClient({
      challenger: entries("c", 2),
      "DIAMOND-I": entries("d", 50),
      "EMERALD-I": entries("e", 3),
      "PLATINUM-I": entries("p", 50),
    });
    const players = await seedPlayers(client, { ...platform, poolSize: 20 }, "gold", []);
    expect(bucketCounts(players)).toEqual({ master_plus: 2, diamond: 13, emerald: 3, platinum: 2 });
  });
});

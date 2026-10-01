import type { Platform } from "./regions.ts";
import type { RiotClient } from "./riot.ts";
import { RANK_BUCKETS, type RankBucket, type TrackedPlayer } from "./types.ts";

const APEX_TIERS = ["challenger", "grandmaster", "master"] as const;
const DIVISIONS = ["I", "II", "III", "IV"];

/** Tiers below Master, walked top-down, with the rank bucket their players count toward. */
export const DIVISION_TIERS: { tier: string; bucket: RankBucket }[] = [
  { tier: "DIAMOND", bucket: "diamond" },
  { tier: "EMERALD", bucket: "emerald" },
  { tier: "PLATINUM", bucket: "platinum" },
  { tier: "GOLD", bucket: "gold" },
];

/**
 * Builds a platform's player pool from the top of the ladder down until `poolSize` is reached.
 * Right after a set launch the apex tiers are empty, so the walk continues through lower tiers;
 * `minBucket` caps how far down it may go.
 */
export async function seedPlayers(
  client: RiotClient,
  platform: Platform,
  minBucket: RankBucket,
  previous: TrackedPlayer[],
): Promise<TrackedPlayer[]> {
  const lastCrawled = new Map(previous.map((player) => [player.puuid, player.lastCrawledAt]));
  const players = new Map<string, TrackedPlayer>();
  const full = () => players.size >= platform.poolSize;
  const add = (puuid: string, bucket: RankBucket) => {
    if (!full() && !players.has(puuid)) players.set(puuid, { puuid, bucket, lastCrawledAt: lastCrawled.get(puuid) });
  };

  for (const tier of APEX_TIERS) {
    const league = await client.apexLeague(platform.id, tier);
    for (const entry of league?.entries ?? []) if (!entry.inactive) add(entry.puuid, "master_plus");
    if (full()) return [...players.values()];
  }

  const floor = RANK_BUCKETS.indexOf(minBucket);
  for (const { tier, bucket } of DIVISION_TIERS) {
    if (RANK_BUCKETS.indexOf(bucket) > floor) break;
    for (const division of DIVISIONS) {
      for (let page = 1; !full(); page++) {
        const entries = await client.leagueEntries(platform.id, tier, division, page);
        if (!entries?.length) break;
        for (const entry of entries) if (!entry.inactive) add(entry.puuid, bucket);
      }
      if (full()) return [...players.values()];
    }
  }
  return [...players.values()];
}

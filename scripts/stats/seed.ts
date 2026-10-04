import type { Platform } from "./regions.ts";
import type { RiotClient } from "./riot.ts";
import { RANK_BUCKETS, type RankBucket, type TrackedPlayer } from "./types.ts";

const APEX_TIERS = ["challenger", "grandmaster", "master"] as const;
const DIVISIONS = ["I", "II", "III", "IV"];

/** League tier names for the buckets below Master. */
const DIVISION_TIER: Partial<Record<RankBucket, string>> = {
  diamond: "DIAMOND",
  emerald: "EMERALD",
  platinum: "PLATINUM",
  gold: "GOLD",
};

/**
 * The share of each platform's pool reserved for each bucket, so every rank floor gets games of its own instead of
 * the apex ladder filling big platforms' pools. Space a bucket can't fill (e.g. a thin Master+ early in a set) passes
 * down; buckets without a share (Platinum, Gold) only get what's left, as an early-set fallback.
 */
export const TIER_SHARES: Partial<Record<RankBucket, number>> = { master_plus: 0.4, diamond: 0.35, emerald: 0.25 };

/** Active players in a bucket, a league page at a time, from its top down. */
async function* ladder(client: RiotClient, platform: string, bucket: RankBucket): AsyncGenerator<string[]> {
  if (bucket === "master_plus") {
    for (const tier of APEX_TIERS) {
      const league = await client.apexLeague(platform, tier);
      yield (league?.entries ?? []).filter((entry) => !entry.inactive).map((entry) => entry.puuid);
    }
    return;
  }
  const tier = DIVISION_TIER[bucket]!;
  for (const division of DIVISIONS) {
    for (let page = 1; ; page++) {
      const entries = await client.leagueEntries(platform, tier, division, page);
      if (!entries?.length) break;
      yield entries.filter((entry) => !entry.inactive).map((entry) => entry.puuid);
    }
  }
}

/**
 * Builds a platform's player pool tier by tier, each up to its share of `poolSize` (plus whatever the tiers above
 * left unused), down to `minBucket`.
 */
export async function seedPlayers(
  client: RiotClient,
  platform: Platform,
  minBucket: RankBucket,
  previous: TrackedPlayer[],
): Promise<TrackedPlayer[]> {
  const lastCrawled = new Map(previous.map((player) => [player.puuid, player.lastCrawledAt]));
  const players = new Map<string, TrackedPlayer>();
  let share = 0;

  for (const bucket of RANK_BUCKETS.slice(0, RANK_BUCKETS.indexOf(minBucket) + 1)) {
    share = Math.min(1, share + (TIER_SHARES[bucket] ?? 1));
    // Cumulative, so space the tiers above didn't use carries down.
    const quota = Math.round(platform.poolSize * share);
    for await (const puuids of ladder(client, platform.id, bucket)) {
      for (const puuid of puuids) {
        if (players.size >= quota) break;
        if (!players.has(puuid)) players.set(puuid, { puuid, bucket, lastCrawledAt: lastCrawled.get(puuid) });
      }
      if (players.size >= quota) break;
    }
    if (players.size >= platform.poolSize) break;
  }
  return [...players.values()];
}

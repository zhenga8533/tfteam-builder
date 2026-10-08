import { isRankFloor, isRegion, type Region } from "@/lib/data/constants";
import type { RankFloor } from "@/lib/data/schema";

/** The rank floor, region or other patch a tier list is narrowed to, kept in the URL. */
export interface StatsScope {
  rank?: RankFloor;
  region?: Region;
  /** Another of the set's patches with its own stats (see `SetStats.patches`): the newest early, or an earlier one. */
  patch?: string;
}

export const parseRank = (value: unknown): RankFloor | undefined => (isRankFloor(value) ? value : undefined);

// A number-only patch such as 18.4 comes back from the URL as a number.
export const parsePatch = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

export const parseStatsScope = (search: Record<string, unknown>): StatsScope => ({
  rank: parseRank(search.rank),
  region: isRegion(search.region) ? search.region : undefined,
  patch: parsePatch(search.patch),
});

/**
 * `StatTierList`'s rank, region and patch choices. Picking one clears the others: regional stats and other patches'
 * stats exist at the default rank floor only, and other patches have no regional stats.
 */
export const scopeChoices = (update: (changes: StatsScope) => void) => ({
  rank: { onChange: (rank?: RankFloor) => update({ rank, region: undefined, patch: undefined }) },
  region: { onChange: (region?: Region) => update({ region, rank: undefined, patch: undefined }) },
  patch: { onChange: (patch?: string) => update({ patch, rank: undefined, region: undefined }) },
});

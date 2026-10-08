import { isRankFloor, isRegion, type Region } from "@/lib/data/constants";
import type { RankFloor } from "@/lib/data/schema";

/** The rank floor, region or newest patch a tier list is narrowed to, kept in the URL. */
export interface StatsScope {
  rank?: RankFloor;
  region?: Region;
  /** The newest patch, chosen for an early look while the stats fall back to the previous one. */
  patch?: string;
}

export const parseRank = (value: unknown): RankFloor | undefined => (isRankFloor(value) ? value : undefined);

export const parseStatsScope = (search: Record<string, unknown>): StatsScope => ({
  rank: parseRank(search.rank),
  region: isRegion(search.region) ? search.region : undefined,
  // A number-only patch such as 18.4 comes back from the URL as a number.
  patch: typeof search.patch === "string" || typeof search.patch === "number" ? String(search.patch) : undefined,
});

/**
 * `StatTierList`'s rank, region and patch choices. Picking one clears the others: regional and newest-patch stats
 * exist at the default rank floor only, and the newest patch has no regional stats.
 */
export const scopeChoices = (scope: StatsScope, update: (changes: StatsScope) => void) => ({
  rank: { value: scope.rank, onChange: (rank?: RankFloor) => update({ rank, region: undefined, patch: undefined }) },
  region: {
    value: scope.region,
    onChange: (region?: Region) => update({ region, rank: undefined, patch: undefined }),
  },
  patch: { value: scope.patch, onChange: (patch?: string) => update({ patch, rank: undefined, region: undefined }) },
});

import { isRankFloor, isRegion, type Region } from "@/lib/data/constants";
import type { RankFloor } from "@/lib/data/schema";

/** The rank floor or region a tier list is narrowed to, kept in the URL. */
export interface StatsScope {
  rank?: RankFloor;
  region?: Region;
}

export const parseRank = (value: unknown): RankFloor | undefined => (isRankFloor(value) ? value : undefined);

export const parseStatsScope = (search: Record<string, unknown>): StatsScope => ({
  rank: parseRank(search.rank),
  region: isRegion(search.region) ? search.region : undefined,
});

/**
 * `StatTierList`'s rank and region choices. Picking one clears the other: regional stats exist at the default
 * rank floor only.
 */
export const scopeChoices = (scope: StatsScope, update: (changes: StatsScope) => void) => ({
  rank: { value: scope.rank, onChange: (rank?: RankFloor) => update({ rank, region: undefined }) },
  region: { value: scope.region, onChange: (region?: Region) => update({ region, rank: undefined }) },
});

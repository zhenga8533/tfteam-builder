import { RANK_OPTIONS, type Region } from "@/lib/data/constants";
import { useStats } from "@/lib/data/hooks";
import type { RankFloor } from "@/lib/data/schema";
import type { RankChoice, RegionChoice } from "./components/stats-meta";

/** The rank floors a page can switch between, for the stats sentence; undefined when there's only one. */
export function useRankChoice(onChange: (rank: RankFloor | undefined) => void): RankChoice | undefined {
  const base = useStats();
  if (!base?.ranks?.length) return undefined;
  const available = [base.rankFloor, ...base.ranks];
  return { floors: RANK_OPTIONS.filter((floor) => available.includes(floor)), base: base.rankFloor, onChange };
}

/** The regions a tier list can narrow to, for the stats sentence; undefined when none have stats. */
export function useRegionChoice(
  value: Region | undefined,
  onChange: (region: Region | undefined) => void,
): RegionChoice | undefined {
  const base = useStats();
  if (!base?.regions?.length) return undefined;
  return { regions: base.regions, value, onChange };
}

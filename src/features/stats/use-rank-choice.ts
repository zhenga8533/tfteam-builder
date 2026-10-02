import { RANK_OPTIONS } from "@/lib/data/constants";
import { useStats } from "@/lib/data/hooks";
import type { RankFloor } from "@/lib/data/schema";
import type { RankChoice } from "./components/stats-meta";

/** The rank floors a page can switch between, for the stats sentence; undefined when there's only one. */
export function useRankChoice(onChange: (rank: RankFloor | undefined) => void): RankChoice | undefined {
  const base = useStats();
  if (!base?.ranks?.length) return undefined;
  const available = [base.rankFloor, ...base.ranks];
  return { floors: RANK_OPTIONS.filter((floor) => available.includes(floor)), base: base.rankFloor, onChange };
}

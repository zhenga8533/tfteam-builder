import { RANK_OPTIONS } from "../data/constants";
import type { RankFloor } from "../data/schema";
import type { ExplorerFilter } from "./engine";

/**
 * The Explorer's files in a set's stats folder. Every query reads all of the patch's boards it's about: a champion's
 * or trait's boards come in one file per rank (`master` holds Master+), so a floor downloads only its ranks' files,
 * and the totals answer queries without either exactly.
 */
export const EXPLORER_FILES = {
  champion: (apiName: string, rank: RankFloor) => `explorer/champions/${apiName}/${rank}.bin.gz`,
  trait: (apiName: string, rank: RankFloor) => `explorer/traits/${apiName}/${rank}.bin.gz`,
  totals: "explorer/totals.json",
};

/** What a query reads: its first champion's file, else its first trait's, else the totals. */
export type ExplorerSource =
  { type: "champion"; apiName: string } | { type: "trait"; apiName: string } | { type: "totals" };

export function explorerSource(filters: ExplorerFilter[]): ExplorerSource {
  const unit = filters.find((filter) => filter.type === "unit");
  if (unit) return { type: "champion", apiName: unit.unit };
  const trait = filters.find((filter) => filter.type === "trait");
  if (trait) return { type: "trait", apiName: trait.trait };
  return { type: "totals" };
}

/** The files a query at `floor` reads: the totals, or the source's file for every rank at or above the floor. */
export function explorerFiles(source: ExplorerSource, floor: RankFloor): string[] {
  if (source.type === "totals") return [EXPLORER_FILES.totals];
  const ranks = RANK_OPTIONS.slice(0, RANK_OPTIONS.indexOf(floor) + 1);
  return ranks.map((rank) => EXPLORER_FILES[source.type](source.apiName, rank));
}

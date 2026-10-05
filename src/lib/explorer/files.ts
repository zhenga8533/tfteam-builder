import type { ExplorerFilter } from "./engine";

/**
 * The Explorer's files in a set's stats folder. Every query reads all of the patch's boards it's about: a champion's
 * or trait's file holds every board with them, and the totals answer queries without either exactly.
 */
export const EXPLORER_FILES = {
  champion: (apiName: string) => `explorer/champions/${apiName}.bin.gz`,
  trait: (apiName: string) => `explorer/traits/${apiName}.bin.gz`,
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

export const explorerFile = (source: ExplorerSource) =>
  source.type === "totals" ? EXPLORER_FILES.totals : EXPLORER_FILES[source.type](source.apiName);

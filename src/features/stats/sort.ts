import type { StatLine } from "@/lib/data/schema";
import { oneOf } from "@/lib/search";
import { percent, share } from "./format";

/** A stat a tier list can rank by in place of its tiers; higher is better for each. */
export const STAT_SORTS = ["play", "win", "top4"] as const;
export type StatSort = (typeof STAT_SORTS)[number];

export const STAT_SORT_LABELS: Record<StatSort, string> = { play: "Play rate", win: "Win rate", top4: "Top 4 rate" };

export const parseStatSort = (value: unknown): StatSort | undefined => oneOf(STAT_SORTS, value);

export const formatStat = (line: StatLine, sort: StatSort) =>
  sort === "play" ? share(line.play) : percent(line[sort], 1);

/** Highest `sort` first; ties go to the better placement. */
export const rankByStat = <T>(entries: T[], lineOf: (entry: T) => StatLine, sort: StatSort): T[] =>
  entries.toSorted((a, b) => lineOf(b)[sort] - lineOf(a)[sort] || lineOf(a).score - lineOf(b).score);

/** How a database page can order its entries in place of its own default order. */
export const DATABASE_SORTS = ["avg", "play"] as const;
export type DatabaseSort = (typeof DATABASE_SORTS)[number];

export const DATABASE_SORT_LABELS: Record<DatabaseSort, string> = { avg: "By placement", play: "By play rate" };

export const parseDatabaseSort = (value: unknown): DatabaseSort | undefined => oneOf(DATABASE_SORTS, value);

/** Best placement or most played first; entries without stats go last. */
export const orderEntries = <T>(
  entries: T[],
  lineOf: (entry: T) => Pick<StatLine, "score" | "play"> | undefined,
  sort: DatabaseSort,
): T[] => {
  const key = (entry: T) => (sort === "avg" ? (lineOf(entry)?.score ?? Infinity) : -(lineOf(entry)?.play ?? 0));
  return entries.toSorted((a, b) => {
    const [x, y] = [key(a), key(b)];
    return x === y ? 0 : x - y;
  });
};

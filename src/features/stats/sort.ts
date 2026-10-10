import type { StatLine } from "@/lib/data/schema";
import { isLowSample } from "@/lib/game/stat-line";
import { percent, share } from "./format";

/** The stats a list can be sorted by. */
export type SortStat = "avg" | "top4" | "win" | "play";

export const SORT_LABELS: Record<SortStat, string> = {
  avg: "By placement",
  top4: "By top 4 rate",
  win: "By win rate",
  play: "By play rate",
};

/** What a database page can order its entries by in place of its own default order. */
export const DATABASE_SORTS = ["avg", "top4", "play"] as const satisfies SortStat[];
export type DatabaseSort = (typeof DATABASE_SORTS)[number];

/** What the comp tier list can rank by in place of its tiers. */
export const COMP_SORTS = ["play", "win", "top4"] as const satisfies SortStat[];
export type CompSort = (typeof COMP_SORTS)[number];

/** A rate a list can be sorted by, as shown next to the entry. */
export const formatRate = (line: Pick<StatLine, "top4" | "win" | "play">, stat: "top4" | "win" | "play") =>
  stat === "play" ? share(line.play) : percent(line[stat]);

/** Highest `sort` first; ties go to the better placement. */
export const rankByStat = <T>(entries: T[], lineOf: (entry: T) => StatLine, sort: CompSort): T[] =>
  entries.toSorted((a, b) => lineOf(b)[sort] - lineOf(a)[sort] || lineOf(a).score - lineOf(b).score);

type SortLine = Pick<StatLine, "score" | "top4" | "play" | "games">;

/**
 * Best placement, best top 4 rate or most played first. Entries without stats go last, and so do low samples when
 * sorting by top 4 rate: unlike placement's score, it isn't adjusted for small samples, so a handful of lucky games
 * would otherwise lead.
 */
export const orderEntries = <T>(entries: T[], lineOf: (entry: T) => SortLine | undefined, sort: DatabaseSort): T[] => {
  const key = (entry: T) => {
    const line = lineOf(entry);
    if (sort === "avg") return line?.score ?? Infinity;
    if (sort === "top4") return line && !isLowSample(line) ? -line.top4 : Infinity;
    return -(line?.play ?? 0);
  };
  return entries.toSorted((a, b) => {
    const [x, y] = [key(a), key(b)];
    return x === y ? 0 : x - y;
  });
};

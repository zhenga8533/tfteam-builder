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

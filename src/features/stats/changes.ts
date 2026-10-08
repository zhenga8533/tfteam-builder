import type { StatLine } from "@/lib/data/schema";
import { MIN_TREND } from "./format";

/** An entry on the earlier patch: average placement, play rate and games (see `PatchTrend.before`). */
export type PriorLine = [avg: number, play: number, games: number];

/** One champion, item, trait breakpoint or comp, on the shown patch and the one before. */
export interface ChangeEntry {
  key: string;
  now?: StatLine;
  before?: PriorLine;
  /** Change in average placement, for entries with enough games on both patches. */
  delta?: number;
}

/** Every entry on either patch. `before` is absent on stats saved before it was recorded. */
export function changeEntries(
  now: Record<string, StatLine>,
  deltas: Record<string, number>,
  before: Record<string, PriorLine> = {},
): ChangeEntry[] {
  const keys = new Set([...Object.keys(now), ...Object.keys(before)]);
  return [...keys].map((key) => ({ key, now: now[key], before: before[key], delta: deltas[key] }));
}

/** Entries whose average placement moved by at least `MIN_TREND`, biggest move first. */
export function placementMovers(entries: ChangeEntry[]) {
  const moved = entries.filter(
    (entry): entry is ChangeEntry & { delta: number } =>
      entry.delta !== undefined && Math.abs(entry.delta) >= MIN_TREND,
  );
  return {
    better: moved.filter((entry) => entry.delta < 0).sort((a, b) => a.delta - b.delta),
    worse: moved.filter((entry) => entry.delta > 0).sort((a, b) => b.delta - a.delta),
  };
}

export const playChange = (entry: ChangeEntry) =>
  entry.now && entry.before ? entry.now.play - entry.before[1] : undefined;

/** Entries played more and less often than on the earlier patch, biggest change first. */
export function playMovers(entries: ChangeEntry[]) {
  const changed = entries.flatMap((entry) => {
    const change = playChange(entry);
    return change ? [{ entry, change }] : [];
  });
  return {
    pickedUp: changed
      .filter(({ change }) => change > 0)
      .sort((a, b) => b.change - a.change)
      .map(({ entry }) => entry),
    droppedOff: changed
      .filter(({ change }) => change < 0)
      .sort((a, b) => a.change - b.change)
      .map(({ entry }) => entry),
  };
}

/** Entries only on the shown patch, and only on the earlier one, most played first. */
export function arrivals(entries: ChangeEntry[]) {
  return {
    added: entries.filter((entry) => entry.now && !entry.before).sort((a, b) => b.now!.play - a.now!.play),
    gone: entries.filter((entry) => entry.before && !entry.now).sort((a, b) => b.before![1] - a.before![1]),
  };
}

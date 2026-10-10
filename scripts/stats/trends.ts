import type { AutoComp, PatchHistory, PatchTrend, SetData, SetStats, StatLine } from "../../src/lib/data/schema.ts";
import { comparePatches } from "../store/state.ts";
import { isRealChange, round } from "../../src/lib/game/stat-line.ts";
import { traitKey } from "../../src/lib/game/traits.ts";
import type { PatchCounters } from "../store/types.ts";
import { buildNewestPatchStats, MIN_EARLY_MATCHES, MIN_GAMES } from "./stats.ts";

type Lines = Record<string, StatLine>;

const traitLines = (stats: SetStats): Lines =>
  Object.fromEntries(stats.traits.map((line) => [traitKey(line.trait, line.minUnits), line]));

/**
 * Changes in average placement (negative = improved) for entries with enough games on both patches, where the change
 * is more than their game counts would show by chance.
 */
function differences(current: Lines, previous: Lines, minGames: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(current).flatMap(([key, line]) => {
      const before = previous[key];
      if (!before || line.games < minGames || before.games < minGames) return [];
      const delta = line.avg - before.avg;
      return isRealChange(delta, line.games, before.games) ? [[key, round(delta, 2)]] : [];
    }),
  );
}

const priorLines = (lines: Lines) =>
  Object.fromEntries(
    Object.entries(lines).map(([key, line]) => [key, [line.avg, line.play, line.games] as [number, number, number]]),
  );

/** How the published stats moved since the newest earlier patch with a summary, or null without one. */
export function patchTrend(current: SetStats, summaries: SetStats[]): PatchTrend | null {
  const previous = summaries
    .filter((summary) => summary.status === "ready" && comparePatches(summary.patch, current.patch) < 0)
    .sort((a, b) => comparePatches(b.patch, a.patch))[0];
  if (!previous || current.status !== "ready") return null;
  return {
    patch: previous.patch,
    units: differences(current.units, previous.units, MIN_GAMES.unit),
    items:
      current.itemsPerBoard === previous.itemsPerBoard
        ? differences(current.items, previous.items, MIN_GAMES.item)
        : {},
    traits: differences(traitLines(current), traitLines(previous), MIN_GAMES.trait),
    before: {
      units: priorLines(previous.units),
      items: current.itemsPerBoard === previous.itemsPerBoard ? priorLines(previous.items) : {},
      traits: priorLines(traitLines(previous)),
    },
  };
}

/**
 * Average placement and play rate per patch (oldest first) for every entry. Averages are null where a patch had too
 * few games; play rates only where the entry wasn't played at all.
 */
export function patchHistory(summaries: SetStats[]): PatchHistory {
  const ready = summaries
    .filter((summary) => summary.status === "ready")
    .sort((a, b) => comparePatches(a.patch, b.patch));
  const series = (linesOf: (stats: SetStats) => Lines, value: (line: StatLine) => number | null) => {
    const keys = new Set(ready.flatMap((stats) => Object.keys(linesOf(stats))));
    return Object.fromEntries(
      [...keys].map((key) => [
        key,
        ready.map((stats) => {
          const line = linesOf(stats)[key];
          return line ? value(line) : null;
        }),
      ]),
    );
  };
  const avg = (minGames: number) => (line: StatLine) => (line.games >= minGames ? line.avg : null);
  const play = (line: StatLine) => line.play;
  // Patches whose items were counted differently from the newest's are left out of the item history.
  const itemCounting = ready.at(-1)?.itemsPerBoard;
  const items = (stats: SetStats) => (stats.itemsPerBoard === itemCounting ? stats.items : {});
  return {
    patches: ready.map((stats) => stats.patch),
    units: series((stats) => stats.units, avg(MIN_GAMES.unit)),
    items: series(items, avg(MIN_GAMES.item)),
    traits: series(traitLines, avg(MIN_GAMES.trait)),
    play: {
      units: series((stats) => stats.units, play),
      items: series(items, play),
      traits: series(traitLines, play),
    },
  };
}

/**
 * Each comp's change in average placement since the previous patch, against every comp there that it now covers:
 * comps merge and split between patches, so a previous comp counts when its signature is one of this comp's. Changes
 * within chance for the games involved are left out, as for tier list entries.
 */
export function compTrends(current: AutoComp[], previous: AutoComp[]): AutoComp[] {
  return current.map((comp) => {
    const signatures = new Set([comp.signature, ...comp.variants]);
    const old = previous.filter((entry) => signatures.has(entry.signature));
    const games = old.reduce((sum, entry) => sum + entry.games, 0);
    if (!games) return comp;
    const delta = comp.avg - old.reduce((sum, entry) => sum + entry.avg * entry.games, 0) / games;
    return isRealChange(delta, comp.games, games) ? { ...comp, trend: round(delta, 2) } : comp;
  });
}

/** Comps on the previous patch that no current comp covers (by signature, as in `compTrends`). */
export function droppedComps(current: AutoComp[], previous: AutoComp[]) {
  const covered = new Set(current.flatMap((comp) => [comp.signature, ...comp.variants]));
  return previous
    .filter((comp) => !covered.has(comp.signature))
    .map(({ id, name, carries, avg, play, games }) => ({ id, name, carries, avg, play, games }));
}

/**
 * Tier list stats for the set's other patches, newest first: the newest patch's early stats while `stats` falls back
 * to the previous one (once it has `MIN_EARLY_MATCHES`), then earlier patches' saved summaries. Sets `newestPatch`.
 */
export function otherPatchStats(data: SetData, patches: PatchCounters[], stats: SetStats, summaries: SetStats[]) {
  const others: SetStats[] = [];
  // Never saved as a summary: the patch's own stats replace it once it has enough games.
  const newest = buildNewestPatchStats(data, patches, stats);
  if (newest) {
    stats.newestPatch = { patch: newest.patch, matches: newest.matches };
    const trend = patchTrend(newest, summaries);
    if (trend) newest.trend = trend;
    if (newest.matches >= MIN_EARLY_MATCHES) others.push(newest);
  }
  const earlier = summaries
    .filter((summary) => comparePatches(summary.patch, stats.patch) < 0)
    .sort((a, b) => comparePatches(b.patch, a.patch));
  // Saved as their patch's stats at the time: what they pointed to then (floors, regions, other patches) is gone, and
  // their trend is recomputed so it has everything a current one has.
  for (const summary of earlier) {
    others.push({
      ...summary,
      trend: patchTrend(summary, summaries) ?? undefined,
      previousPatch: false,
      patches: undefined,
      newestPatch: undefined,
      ranks: undefined,
      regions: undefined,
    });
  }
  return others;
}

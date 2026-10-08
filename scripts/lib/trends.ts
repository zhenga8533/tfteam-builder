import type { AutoComp, PatchHistory, PatchTrend, SetData, SetStats, StatLine } from "../../src/lib/data/schema.ts";
import { comparePatches } from "../stats/state.ts";
import { round } from "../../src/lib/game/stat-line.ts";
import { traitKey } from "../../src/lib/game/traits.ts";
import type { PatchCounters } from "../stats/types.ts";
import { buildNewestPatchStats, MIN_EARLY_MATCHES, MIN_GAMES } from "./stats.ts";

type Lines = Record<string, StatLine>;

const traitLines = (stats: SetStats): Lines =>
  Object.fromEntries(stats.traits.map((line) => [traitKey(line.trait, line.minUnits), line]));

/** Changes in average placement for entries with enough games on both patches (negative = improved). */
function differences(current: Lines, previous: Lines, minGames: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(current).flatMap(([key, line]) => {
      const before = previous[key];
      if (!before || line.games < minGames || before.games < minGames) return [];
      return [[key, round(line.avg - before.avg, 2)]];
    }),
  );
}

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
  };
}

/** Average placement per patch (oldest first) for every entry; null where a patch had too few games. */
export function patchHistory(summaries: SetStats[]): PatchHistory {
  const ready = summaries
    .filter((summary) => summary.status === "ready")
    .sort((a, b) => comparePatches(a.patch, b.patch));
  const series = (linesOf: (stats: SetStats) => Lines, minGames: number) => {
    const keys = new Set(ready.flatMap((stats) => Object.keys(linesOf(stats))));
    return Object.fromEntries(
      [...keys].map((key) => [
        key,
        ready.map((stats) => {
          const line = linesOf(stats)[key];
          return line && line.games >= minGames ? line.avg : null;
        }),
      ]),
    );
  };
  // Patches whose items were counted differently from the newest's are left out of the item history.
  const itemCounting = ready.at(-1)?.itemsPerBoard;
  return {
    patches: ready.map((stats) => stats.patch),
    units: series((stats) => stats.units, MIN_GAMES.unit),
    items: series((stats) => (stats.itemsPerBoard === itemCounting ? stats.items : {}), MIN_GAMES.item),
    traits: series(traitLines, MIN_GAMES.trait),
  };
}

/**
 * Each comp's change in average placement since the previous patch, against every comp there that it now covers:
 * comps merge and split between patches, so a previous comp counts when its signature is one of this comp's.
 */
export function compTrends(current: AutoComp[], previous: AutoComp[]): AutoComp[] {
  return current.map((comp) => {
    const signatures = new Set([comp.signature, ...comp.variants]);
    const old = previous.filter((entry) => signatures.has(entry.signature));
    const games = old.reduce((sum, entry) => sum + entry.games, 0);
    if (!games) return comp;
    const avg = old.reduce((sum, entry) => sum + entry.avg * entry.games, 0) / games;
    return { ...comp, trend: round(comp.avg - avg, 2) };
  });
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
  // Saved as their patch's stats at the time: what they pointed to then (floors, regions, other patches) is gone.
  for (const summary of earlier) {
    others.push({
      ...summary,
      previousPatch: false,
      patches: undefined,
      newestPatch: undefined,
      ranks: undefined,
      regions: undefined,
    });
  }
  return others;
}

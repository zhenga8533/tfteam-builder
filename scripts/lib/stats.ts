import { RANK_FLOORS, STAT_TIERS } from "../../src/lib/data/constants.ts";
import type { RankFloor, SetData, SetStats, StatLine, TraitStat } from "../../src/lib/data/schema.ts";
import { statLine } from "../../src/lib/game/stat-line.ts";
import { emptyCounters, mergeCounters } from "../stats/aggregate.ts";

import { comparePatches } from "../stats/state.ts";
import { type Counter, type Counters, type PatchCounters, RANK_BUCKETS, type RankBucket } from "../stats/types.ts";

/** Minimum ranked matches before a rank floor (and patch) is trusted. */
export const MIN_MATCHES = 2000;
/** Minimum games for an entry to receive a tier; below this it is shown but not ranked. */
export const MIN_GAMES = { unit: 200, item: 200, trait: 150, unitItem: 50, form: 50 } as const;
/** Cumulative share of ranked entries per tier: top 10% S, next 25% A, next 35% B, rest C. */
const TIER_CUTOFFS = [0.1, 0.35, 0.7, 1] as const;
const BEST_ITEMS_PER_UNIT = 6;

/** Rank buckets whose matches count toward each floor, e.g. Diamond+ = Master+ and Diamond. */
export const FLOOR_BUCKETS: Record<RankFloor, RankBucket[]> = {
  diamond: ["master_plus", "diamond"],
  emerald: ["master_plus", "diamond", "emerald"],
  platinum: ["master_plus", "diamond", "emerald", "platinum"],
  gold: [...RANK_BUCKETS],
};

export function countersAtFloor(patch: PatchCounters, floor: RankFloor): Counters {
  const combined = emptyCounters();
  for (const bucket of FLOOR_BUCKETS[floor]) {
    const counters = patch.buckets[bucket];
    if (counters) mergeCounters(combined, counters);
  }
  return combined;
}

export interface Sample {
  patch: PatchCounters;
  floor: RankFloor;
  counters: Counters;
  previousPatch: boolean;
}

/**
 * Picks the data to show for a set: the newest patch at the highest rank floor with enough matches.
 * A patch that just released falls back to the previous patch of the same set; a brand-new set has
 * no previous patch, so it drops to lower rank floors instead.
 */
export function chooseSample(patches: PatchCounters[], minMatches = MIN_MATCHES): Sample | null {
  const newestFirst = [...patches].sort((a, b) => comparePatches(b.patch, a.patch));
  for (const [index, patch] of newestFirst.slice(0, 2).entries()) {
    for (const floor of RANK_FLOORS) {
      const counters = countersAtFloor(patch, floor);
      if (counters.matches >= minMatches) return { patch, floor, counters, previousPatch: index > 0 };
    }
  }
  return null;
}

/** Ranks entries with enough games by adjusted average placement and assigns S–C by share. */
export function assignTiers(lines: StatLine[], minGames: number) {
  const ranked = lines.filter((line) => line.games >= minGames).sort((a, b) => a.avg - b.avg);
  ranked.forEach((line, index) => {
    const share = (index + 1) / ranked.length;
    line.tier = STAT_TIERS[TIER_CUTOFFS.findIndex((cutoff) => share <= cutoff)];
  });
}

/** Maps game names in match data to the site's apiNames, collecting names it can't place. */
export class NameResolver {
  readonly unknown = new Map<string, number>();
  private readonly exact: Map<string, string>;
  private readonly lower: Map<string, string>;

  constructor(apiNames: string[], aliases: Record<string, string> = {}) {
    this.exact = new Map([...apiNames.map((name) => [name, name] as const), ...Object.entries(aliases)]);
    this.lower = new Map([...this.exact].map(([name, target]) => [name.toLowerCase(), target]));
  }

  resolve(name: string, games: number): string | undefined {
    const target = this.exact.get(name) ?? this.lower.get(name.toLowerCase());
    if (!target) this.unknown.set(name, (this.unknown.get(name) ?? 0) + games);
    return target;
  }
}

/** Sums counters whose keys map to the same site apiName (e.g. duplicate item variants). */
function collect(record: Record<string, Counter>, resolve: (key: string, games: number) => string | undefined) {
  const result = new Map<string, Counter>();
  for (const [key, counter] of Object.entries(record)) {
    const target = resolve(key, counter[0]);
    if (!target) continue;
    const [games, placementSum, top4, wins] = result.get(target) ?? [0, 0, 0, 0];
    result.set(target, [games + counter[0], placementSum + counter[1], top4 + counter[2], wins + counter[3]]);
  }
  return result;
}

/** Items worth ranking: everything but components, which are carried around mid-game rather than built. */
export const rankableItems = (data: SetData) =>
  new Set(data.items.filter((item) => item.kind !== "component").map((item) => item.apiName));

/** Resolvers mapping Riot's names in stored boards to the site's apiNames (forms and item variants included). */
export function resolversFor(data: SetData) {
  return {
    units: new NameResolver(
      data.champions.map((champion) => champion.apiName),
      data.championAliases,
    ),
    items: new NameResolver(
      data.items.map((item) => item.apiName),
      data.itemAliases,
    ),
    traits: new NameResolver(data.traits.map((trait) => trait.apiName)),
  };
}

export interface BuildResult {
  stats: SetStats;
  unknown: { units: Map<string, number>; items: Map<string, number>; traits: Map<string, number> };
}

export function buildSetStats(data: SetData, patches: PatchCounters[], now = new Date()): BuildResult {
  // Forms resolve to their base champion, so e.g. every Lux form counts toward Lux.
  const { units, items, traits } = resolversFor(data);
  const unknown = { units: units.unknown, items: items.unknown, traits: traits.unknown };
  const sample = chooseSample(patches);

  if (!sample) {
    const newest = [...patches].sort((a, b) => comparePatches(b.patch, a.patch))[0];
    const matches = newest ? countersAtFloor(newest, "gold").matches : 0;
    return {
      stats: {
        set: data.number,
        patch: newest?.patch ?? "",
        updatedAt: newest?.updatedAt || now.toISOString(),
        status: "collecting",
        rankFloor: "gold",
        matches,
        previousPatch: false,
        units: {},
        forms: {},
        items: {},
        traits: [],
        bestItems: {},
      },
      unknown,
    };
  }

  const { counters } = sample;
  const rankable = rankableItems(data);

  const unitCounters = collect(counters.units, (key, games) => units.resolve(key, games));
  const unitLines = Object.fromEntries(
    [...unitCounters].map(([name, counter]) => [name, statLine(counter, counters.boards)]),
  );
  assignTiers(Object.values(unitLines), MIN_GAMES.unit);
  const formLines = Object.fromEntries(
    Object.entries(counters.units)
      // Match data usually reports the base champion, so forms are sparse; skip ones too rare to say anything.
      .filter(([apiName, [games]]) => apiName in data.championAliases && games >= MIN_GAMES.form)
      .map(([apiName, counter]) => [apiName, statLine(counter, counters.boards)]),
  );

  const itemCounters = collect(counters.items, (key, games) => items.resolve(key, games));
  const equipped = [...itemCounters.values()].reduce((total, [games]) => total + games, 0);
  const itemLines = Object.fromEntries([...itemCounters].map(([name, counter]) => [name, statLine(counter, equipped)]));
  assignTiers(
    Object.entries(itemLines).flatMap(([name, line]) => (rankable.has(name) ? [line] : [])),
    MIN_GAMES.item,
  );

  const traitsByApi = new Map(data.traits.map((trait) => [trait.apiName, trait]));
  const traitLines: TraitStat[] = [];
  for (const [key, counter] of Object.entries(counters.traits)) {
    const [name = "", tierCurrent] = key.split("|");
    const apiName = traits.resolve(name, counter[0]);
    // `tier_current` counts reached breakpoints, so it is a 1-based index into the trait's breakpoints.
    const breakpoint = apiName ? traitsByApi.get(apiName)?.breakpoints[Number(tierCurrent) - 1] : undefined;
    if (!apiName || !breakpoint) continue;
    traitLines.push({ trait: apiName, minUnits: breakpoint.minUnits, ...statLine(counter, counters.boards) });
  }
  assignTiers(traitLines, MIN_GAMES.trait);

  const bestItems: SetStats["bestItems"] = {};
  const unitItemCounters = collect(counters.unitItems, (key) => {
    const [unit = "", item = ""] = key.split("|");
    const unitName = units.resolve(unit, 0);
    const itemName = items.resolve(item, 0);
    return unitName && itemName && rankable.has(itemName) ? `${unitName}|${itemName}` : undefined;
  });
  for (const [key, counter] of unitItemCounters) {
    if (counter[0] < MIN_GAMES.unitItem) continue;
    const [unit = "", item = ""] = key.split("|");
    const unitGames = unitCounters.get(unit)?.[0] ?? counter[0];
    (bestItems[unit] ??= []).push({ item, ...statLine(counter, unitGames) });
  }
  for (const list of Object.values(bestItems)) list.sort((a, b) => a.avg - b.avg).splice(BEST_ITEMS_PER_UNIT);

  return {
    stats: {
      set: data.number,
      patch: sample.patch.patch,
      updatedAt: sample.patch.updatedAt || now.toISOString(),
      status: "ready",
      rankFloor: sample.floor,
      matches: counters.matches,
      previousPatch: sample.previousPatch,
      units: unitLines,
      forms: formLines,
      items: itemLines,
      traits: traitLines.sort((a, b) => a.avg - b.avg),
      bestItems,
    },
    unknown,
  };
}

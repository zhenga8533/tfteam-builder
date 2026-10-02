import type { Champion, Item, Trait } from "@/lib/data/schema";
import { computeTraits, type TraitState, type TraitStyle } from "./traits";

export interface PlannerData {
  champions: Champion[];
  championsByApi: Map<string, Champion>;
  traitsByApi: Map<string, Trait>;
  itemsByApi: Map<string, Item>;
}

interface UnitLike {
  apiName: string;
  items: string[];
}

/**
 * Every unit with a unique trait activates it alone, so a unique trait only breaks ties: it never outweighs
 * a real breakpoint, but between otherwise equal boards the one whose units bring their unique bonus wins.
 */
const STYLE_VALUE: Record<TraitStyle, number> = {
  inactive: 0,
  unique: 0.05,
  bronze: 1,
  silver: 2,
  gold: 3,
  prismatic: 4,
};

/** How strong a board's traits are: each active trait scores by its tier (bronze 1 … prismatic 4). */
const traitScore = (states: TraitState[]) => states.reduce((total, state) => total + STYLE_VALUE[state.style], 0);

/**
 * What autofill aims for. "most" activates as many different traits as possible (deeper breakpoints only
 * break ties); "levels" adds up breakpoint tiers, so one gold trait is worth three bronze ones. `around`
 * first takes that trait as far as the slots allow, then fills by `mode`.
 */
export interface AutofillGoal {
  mode: "most" | "levels";
  around?: string;
  /** Most expensive champion to add; by level when unset (see `defaultMaxCost`). */
  maxCost?: number;
}

/** Breakpoint depth only decides between boards with the same number of active traits. */
const LEVEL_TIEBREAK = 0.2;
/** Any extra unit of the chosen trait outweighs every other consideration. */
const AROUND_WEIGHT = 100;

const activeCount = (states: TraitState[]) =>
  states.reduce(
    (total, state) => total + (state.style === "inactive" ? 0 : state.style === "unique" ? STYLE_VALUE.unique : 1),
    0,
  );

function goalScore(states: TraitState[], goal: AutofillGoal) {
  const base = goal.mode === "levels" ? traitScore(states) : activeCount(states) + LEVEL_TIEBREAK * traitScore(states);
  const around = goal.around ? (states.find((state) => state.trait.apiName === goal.around)?.count ?? 0) : 0;
  return AROUND_WEIGHT * around + base;
}

/** A champion and its forms are one shop unit, so only one of them can be fielded. */
const unitGroup = (champion: Champion) => champion.formOf ?? champion.apiName;

function boardScore(units: UnitLike[], data: PlannerData, goal: AutofillGoal = { mode: "levels" }) {
  return goalScore(computeTraits(units, data.championsByApi, data.traitsByApi, data.itemsByApi), goal);
}

function candidatesFor(units: UnitLike[], data: PlannerData) {
  const fielded = new Set(units.flatMap((unit) => data.championsByApi.get(unit.apiName) ?? []).map(unitGroup));
  return data.champions.filter((champion) => !fielded.has(unitGroup(champion)));
}

export interface LadderStep {
  trait: Trait;
  count: number;
  /** Units needed for the next breakpoint. */
  next: number;
  /** Champions with the trait that aren't fielded yet, the best trait gain for the board first. */
  candidates: Champion[];
}

/** For each trait on the board below its top breakpoint: the next breakpoint and who gets it there. */
export function traitLadder(units: UnitLike[], data: PlannerData): LadderStep[] {
  const states = computeTraits(units, data.championsByApi, data.traitsByApi, data.itemsByApi);
  const pool = candidatesFor(units, data);
  return states.flatMap((state) => {
    const next = state.trait.breakpoints.find((breakpoint) => breakpoint.minUnits > state.count);
    if (!next) return [];
    const candidates = pool
      .filter((champion) => champion.traits.includes(state.trait.apiName))
      .map((champion) => ({ champion, score: boardScore([...units, { apiName: champion.apiName, items: [] }], data) }))
      .sort((a, b) => b.score - a.score || a.champion.cost - b.champion.cost)
      .map(({ champion }) => champion);
    return [{ trait: state.trait, count: state.count, next: next.minUnits, candidates }];
  });
}

/** Partial boards kept at each step of the search; wider finds better boards but takes longer. */
const BEAM_WIDTH = 24;
/** Keeps trait score in charge: unit strength only breaks ties between equally good trait spreads. */
const STRENGTH_WEIGHT = 0.01;

/** Shops rarely offer pricier units below these levels, so autofill skips them by default. */
export function defaultMaxCost(level: number): number {
  if (level <= 5) return 3;
  if (level <= 7) return 4;
  return 5;
}

export interface AutofillOptions {
  /** Most expensive champion to add; everything by default. */
  maxCost?: number;
  /** Ranks champions for tie-breaks (higher is better), e.g. from average placement; cost by default. */
  strength?: (champion: Champion) => number;
  /** How many distinct boards to return. */
  count?: number;
}

/** Suggestions must differ by at least this many champions, so the list isn't one board with a swap. */
const MIN_DIFFERENCE = 2;

/**
 * The best ways to add `slots` champions to `units` for `goal`, best first, by beam search. Each
 * suggestion differs from the ones before it by at least two champions (or all of them, for one slot).
 */
export function autofillOptions(
  units: UnitLike[],
  slots: number,
  data: PlannerData,
  goal: AutofillGoal = { mode: "most" },
  { maxCost = 5, strength = (champion) => champion.cost / 5, count = 1 }: AutofillOptions = {},
): Champion[][] {
  type State = { added: Champion[]; value: number };
  const affordable = { ...data, champions: data.champions.filter((champion) => champion.cost <= maxCost) };
  let beam: State[] = [{ added: [], value: 0 }];
  for (let step = 0; step < slots; step++) {
    const next = new Map<string, State>();
    for (const state of beam) {
      const board = [...units, ...state.added.map((champion) => ({ apiName: champion.apiName, items: [] }))];
      for (const champion of candidatesFor(board, affordable)) {
        const added = [...state.added, champion];
        const key = added
          .map((entry) => entry.apiName)
          .sort()
          .join("|");
        if (next.has(key)) continue;
        const value =
          boardScore([...board, { apiName: champion.apiName, items: [] }], data, goal) +
          STRENGTH_WEIGHT * added.reduce((total, entry) => total + strength(entry), 0);
        next.set(key, { added, value });
      }
    }
    if (next.size === 0) break;
    beam = [...next.values()].sort((a, b) => b.value - a.value).slice(0, BEAM_WIDTH);
  }

  const required = Math.min(MIN_DIFFERENCE, slots);
  const picked: Champion[][] = [];
  for (const { added } of beam) {
    if (picked.length >= count || added.length === 0) break;
    const names = new Set(added.map((champion) => champion.apiName));
    const distinct = picked.every(
      (other) => other.filter((champion) => !names.has(champion.apiName)).length >= required,
    );
    if (distinct) picked.push(added);
  }
  return picked;
}

/** The single best way to fill `slots`; see `autofillOptions`. */
export function autofill(
  units: UnitLike[],
  slots: number,
  data: PlannerData,
  goal: AutofillGoal = { mode: "most" },
  options: Omit<AutofillOptions, "count"> = {},
): Champion[] {
  return autofillOptions(units, slots, data, goal, options)[0] ?? [];
}

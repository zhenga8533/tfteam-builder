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

/** Every unit with a unique trait activates it alone, so those are worth little next to a real breakpoint. */
const STYLE_VALUE: Record<TraitStyle, number> = {
  inactive: 0,
  unique: 0.25,
  bronze: 1,
  silver: 2,
  gold: 3,
  prismatic: 4,
};

/** How strong a board's traits are: each active trait scores by its tier (bronze 1 … prismatic 4). */
export const traitScore = (states: TraitState[]) =>
  states.reduce((total, state) => total + STYLE_VALUE[state.style], 0);

/** A champion and its forms are one shop unit, so only one of them can be fielded. */
const unitGroup = (champion: Champion) => champion.formOf ?? champion.apiName;

function boardScore(units: UnitLike[], data: PlannerData) {
  return traitScore(computeTraits(units, data.championsByApi, data.traitsByApi, data.itemsByApi));
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

/**
 * Picks `slots` champions to add to `units` for the strongest traits, by beam search. `strength`
 * ranks champions for tie-breaks (higher is better), e.g. from average placement; cost by default.
 */
export function autofill(
  units: UnitLike[],
  slots: number,
  data: PlannerData,
  strength: (champion: Champion) => number = (champion) => champion.cost / 5,
): Champion[] {
  type State = { added: Champion[]; value: number };
  let beam: State[] = [{ added: [], value: 0 }];
  for (let step = 0; step < slots; step++) {
    const next = new Map<string, State>();
    for (const state of beam) {
      const board = [...units, ...state.added.map((champion) => ({ apiName: champion.apiName, items: [] }))];
      for (const champion of candidatesFor(board, data)) {
        const added = [...state.added, champion];
        const key = added
          .map((entry) => entry.apiName)
          .sort()
          .join("|");
        if (next.has(key)) continue;
        const value =
          boardScore([...board, { apiName: champion.apiName, items: [] }], data) +
          STRENGTH_WEIGHT * added.reduce((total, entry) => total + strength(entry), 0);
        next.set(key, { added, value });
      }
    }
    if (next.size === 0) break;
    beam = [...next.values()].sort((a, b) => b.value - a.value).slice(0, BEAM_WIDTH);
  }
  return beam[0]?.added ?? [];
}

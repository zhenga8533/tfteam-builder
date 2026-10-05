import type { DeltaStat, StatLine } from "@/lib/data/schema";
import { addCounter, bump, type Counter, counterFor, emptyCounter, round, statLine } from "@/lib/game/stat-line";
import { type ExplorerData, ITEM_SLOTS } from "./format";
import type { ExplorerTotals } from "./totals";

export type ExplorerFilter =
  /** A unit on the board, optionally at a minimum star level and holding the given items (duplicates allowed). */
  | { type: "unit"; unit: string; minStar?: number; items?: string[] }
  /** A trait active at or above a breakpoint. */
  | { type: "trait"; trait: string; minUnits: number }
  /** The player's level at or above a value. */
  | { type: "level"; min: number };

export interface ExplorerRow {
  key: string;
  line: DeltaStat;
}

export interface ExplorerResult {
  /** Boards matching every filter; `play` is their share of all boards at the floor. Null when nothing matches. */
  summary: StatLine | null;
  /** Units on matching boards, other than filtered ones. */
  units: ExplorerRow[];
  /** Active trait breakpoints (`apiName:minUnits`) on matching boards. */
  traits: ExplorerRow[];
  /** For each unit filter, the items that unit holds on matching boards. */
  items: Record<string, ExplorerRow[]>;
}

/** Below this many games a breakdown row is hidden; the sample is too small to say anything. */
const MIN_ROW_GAMES = 30;

interface Compiled {
  units: { filter: string; unit: number; minStar: number; items: number[] }[];
  traits: { trait: number; minUnits: number }[];
  minLevel: number;
}

/** Resolves names to dictionary indices; returns null if a filter names something absent from the sample. */
function compile(data: ExplorerData, filters: ExplorerFilter[]): Compiled | null {
  const index = (names: string[]) => new Map(names.map((name, i) => [name, i]));
  const units = index(data.units);
  const items = index(data.items);
  const traits = index(data.traits);
  const compiled: Compiled = { units: [], traits: [], minLevel: 0 };

  for (const filter of filters) {
    if (filter.type === "unit") {
      const unit = units.get(filter.unit);
      const itemSlots = (filter.items ?? []).map((item) => items.get(item));
      if (unit === undefined || itemSlots.some((slot) => slot === undefined)) return null;
      compiled.units.push({
        filter: filter.unit,
        unit,
        minStar: filter.minStar ?? 0,
        items: itemSlots.map((slot) => slot! + 1),
      });
    } else if (filter.type === "trait") {
      const trait = traits.get(filter.trait);
      if (trait === undefined) return null;
      compiled.traits.push({ trait, minUnits: filter.minUnits });
    } else {
      compiled.minLevel = Math.max(compiled.minLevel, filter.min);
    }
  }
  return compiled;
}

/** Whether a unit row holds every wanted item (as a multiset of slot values). */
function holds(data: ExplorerData, row: number, wanted: number[]) {
  if (wanted.length === 0) return true;
  const slots = Array.from(data.unitItems.subarray(row * ITEM_SLOTS, (row + 1) * ITEM_SLOTS));
  return wanted.every((item) => {
    const at = slots.indexOf(item);
    if (at === -1) return false;
    slots[at] = 0;
    return true;
  });
}

function rows(counters: Map<string, Counter>, baseline: number, total: number, minGames: number): ExplorerRow[] {
  return [...counters]
    .filter(([, counter]) => counter[0] >= minGames)
    .map(([key, counter]) => {
      const line = statLine(counter, total);
      return { key, line: { ...line, delta: round(line.avg - baseline, 2) } };
    })
    .sort((a, b) => a.line.score - b.line.score);
}

const boardsAtFloor = (population: number[], floor: number) =>
  population.slice(0, floor + 1).reduce((total, boards) => total + boards, 0);

/** `floor`: include boards at this rank index or above (see `ExplorerBoard.rank`); the file's default floor if unset. */
export function runQuery(
  data: ExplorerData,
  filters: ExplorerFilter[],
  minGames = MIN_ROW_GAMES,
  floor = data.defaultRank,
): ExplorerResult {
  const empty: ExplorerResult = { summary: null, units: [], traits: [], items: {} };
  const compiled = compile(data, filters);
  if (!compiled) return empty;

  const summary = emptyCounter();
  const unitCounters = new Map<string, Counter>();
  const traitCounters = new Map<string, Counter>();
  const itemCounters = new Map(compiled.units.map((filter) => [filter.filter, new Map<string, Counter>()]));
  const filtered = new Set(compiled.units.map((filter) => filter.unit));
  const matchedRows: number[] = [];

  // Shares are of the boards at this floor, not the whole sample (which can hold lower floors too).
  let atFloor = 0;
  for (let board = 0; board < data.boards; board++) {
    if (data.rank[board]! > floor) continue;
    atFloor++;
    if (data.level[board]! < compiled.minLevel) continue;
    const unitStart = data.unitStart[board]!;
    const unitEnd = data.unitStart[board + 1]!;
    const traitStart = data.traitStart[board]!;
    const traitEnd = data.traitStart[board + 1]!;

    matchedRows.length = 0;
    const unitsMatch = compiled.units.every((filter) => {
      for (let row = unitStart; row < unitEnd; row++) {
        if (
          data.unitIndex[row] === filter.unit &&
          data.unitStar[row]! >= filter.minStar &&
          holds(data, row, filter.items)
        ) {
          matchedRows.push(row);
          return true;
        }
      }
      return false;
    });
    if (!unitsMatch) continue;
    const traitsMatch = compiled.traits.every((filter) => {
      for (let row = traitStart; row < traitEnd; row++) {
        if (data.traitIndex[row] === filter.trait && data.traitMinUnits[row]! >= filter.minUnits) return true;
      }
      return false;
    });
    if (!traitsMatch) continue;

    const placement = data.placement[board]!;
    bump(summary, placement);
    const seen = new Set<number>();
    for (let row = unitStart; row < unitEnd; row++) {
      const unit = data.unitIndex[row]!;
      if (filtered.has(unit) || seen.has(unit)) continue;
      seen.add(unit);
      bump(counterFor(unitCounters, data.units[unit]!), placement);
    }
    for (let row = traitStart; row < traitEnd; row++) {
      bump(counterFor(traitCounters, `${data.traits[data.traitIndex[row]!]}:${data.traitMinUnits[row]}`), placement);
    }
    compiled.units.forEach((filter, i) => {
      const row = matchedRows[i]!;
      for (let slot = 0; slot < ITEM_SLOTS; slot++) {
        const item = data.unitItems[row * ITEM_SLOTS + slot]!;
        if (item) bump(counterFor(itemCounters.get(filter.filter)!, data.items[item - 1]!), placement);
      }
    });
  }

  if (summary[0] === 0) return empty;
  const line = statLine(summary, data.population ? boardsAtFloor(data.population, floor) : atFloor);
  return {
    summary: line,
    units: rows(unitCounters, line.avg, summary[0], minGames),
    traits: rows(traitCounters, line.avg, summary[0], minGames),
    items: Object.fromEntries(
      [...itemCounters].map(([unit, counters]) => [unit, rows(counters, line.avg, summary[0], minGames)]),
    ),
  };
}

/**
 * `runQuery` for the totals, which have every board's counts by rank and level, so it takes level filters only (see
 * `explorerSource`).
 */
export function runTotalsQuery(
  totals: ExplorerTotals,
  filters: ExplorerFilter[],
  minGames = MIN_ROW_GAMES,
  floor = totals.defaultRank,
): ExplorerResult {
  let minLevel = 0;
  for (const filter of filters) {
    if (filter.type !== "level") throw new Error("The totals only answer level filters");
    minLevel = Math.max(minLevel, filter.min);
  }
  const summary = emptyCounter();
  const unitCounters = new Map<string, Counter>();
  const traitCounters = new Map<string, Counter>();
  let atFloor = 0;
  for (const group of totals.groups) {
    if (group.rank > floor) continue;
    atFloor += group.summary[0];
    if (group.level < minLevel) continue;
    addCounter(summary, group.summary);
    for (const [unit, counter] of Object.entries(group.units)) addCounter(counterFor(unitCounters, unit), counter);
    for (const [trait, counter] of Object.entries(group.traits)) addCounter(counterFor(traitCounters, trait), counter);
  }

  if (summary[0] === 0) return { summary: null, units: [], traits: [], items: {} };
  const line = statLine(summary, atFloor);
  return {
    summary: line,
    units: rows(unitCounters, line.avg, summary[0], minGames),
    traits: rows(traitCounters, line.avg, summary[0], minGames),
    items: {},
  };
}

export interface SimilarBoards {
  /** How many of the board's units each matching board shares. */
  shared: number;
  /** Units on the board that was compared. */
  total: number;
  line: StatLine;
}

/** The fewest units two boards must share before they count as similar. */
const MIN_SHARED = 3;

/**
 * Stats for sample boards that share as many of `units` as possible: the largest overlap with at least
 * `minGames` boards. Null when no overlap of `MIN_SHARED` or more units has enough boards.
 */
export function similarBoards(
  data: ExplorerData,
  units: string[],
  minGames = MIN_ROW_GAMES,
  floor = data.defaultRank,
): SimilarBoards | null {
  const index = new Map(data.units.map((name, i) => [name, i]));
  const wanted = new Set(units.flatMap((unit) => index.get(unit) ?? []));
  if (wanted.size < MIN_SHARED) return null;

  // byOverlap[k] counts boards sharing exactly k of the wanted units.
  const byOverlap = Array.from({ length: wanted.size + 1 }, emptyCounter);
  let atFloor = 0;
  for (let board = 0; board < data.boards; board++) {
    if (data.rank[board]! > floor) continue;
    atFloor++;
    const seen = new Set<number>();
    for (let row = data.unitStart[board]!; row < data.unitStart[board + 1]!; row++) {
      const unit = data.unitIndex[row]!;
      if (wanted.has(unit)) seen.add(unit);
    }
    bump(byOverlap[seen.size]!, data.placement[board]!);
  }

  // Walk down from a full match, adding boards with one fewer shared unit until there are enough.
  const total = emptyCounter();
  for (let shared = wanted.size; shared >= MIN_SHARED; shared--) {
    addCounter(total, byOverlap[shared]!);
    if (total[0] >= minGames) return { shared, total: wanted.size, line: statLine(total, atFloor) };
  }
  return null;
}

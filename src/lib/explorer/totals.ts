import { bump, type Counter, counterFor, emptyCounter } from "../game/stat-line";
import { traitKey } from "../game/traits";
import type { ExplorerBoard } from "./format";

/** Counts for every board at one rank (an index into `RANK_BUCKETS`) and player level. */
export interface TotalsGroup {
  rank: number;
  level: number;
  summary: Counter;
  /** Counted once per board. */
  units: Record<string, Counter>;
  /** Keyed by `apiName:minUnits`, like the Explorer's trait rows. */
  traits: Record<string, Counter>;
}

/** Every board's counts by rank and level (`explorer/totals.json`), for queries without a champion or trait. */
export interface ExplorerTotals {
  /** Boards at this rank or above make up the default view, as in `ExplorerHeader`. */
  defaultRank: number;
  groups: TotalsGroup[];
}

interface Group {
  summary: Counter;
  units: Map<string, Counter>;
  traits: Map<string, Counter>;
}

export class TotalsAccumulator {
  private readonly groups = new Map<string, { rank: number; level: number; group: Group }>();

  add(board: ExplorerBoard) {
    const { rank } = board;
    const key = `${rank}/${board.level}`;
    let entry = this.groups.get(key);
    if (!entry) {
      entry = { rank, level: board.level, group: { summary: emptyCounter(), units: new Map(), traits: new Map() } };
      this.groups.set(key, entry);
    }
    const { group } = entry;
    bump(group.summary, board.placement);
    for (const apiName of new Set(board.units.map((unit) => unit.apiName))) {
      bump(counterFor(group.units, apiName), board.placement);
    }
    for (const trait of board.traits)
      bump(counterFor(group.traits, traitKey(trait.apiName, trait.minUnits)), board.placement);
  }

  results(defaultRank: number): ExplorerTotals {
    return {
      defaultRank,
      groups: [...this.groups.values()].map(({ rank, level, group }) => ({
        rank,
        level,
        summary: group.summary,
        units: Object.fromEntries(group.units),
        traits: Object.fromEntries(group.traits),
      })),
    };
  }
}

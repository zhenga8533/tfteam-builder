import type { AutoComp, ChampionStats, ItemStats, StatLine, TraitStats } from "../../src/lib/data/schema.ts";
import { bump as bumpCounter, counterFor, round, statLine } from "../../src/lib/game/stat-line.ts";
import type { Counter } from "../store/types.ts";
import type { ResolvedBoard } from "./boards.ts";

/** Minimum games before an item pairing or a unit in a trait is listed. */
export const MIN_DATABASE_GAMES = { pair: 50, traitUnit: 50 } as const;

const bump = (map: Map<string, Counter>, key: string, placement: number) =>
  bumpCounter(counterFor(map, key), placement);

const withDelta = (line: StatLine, baseline: StatLine) => ({ ...line, delta: round(line.avg - baseline.avg, 2) });
const byScore = (a: StatLine, b: StatLine) => a.score - b.score;

/** Accumulates the item and trait detail pages from boards in the selected sample. */
export class DatabaseAccumulator {
  /** Per board building the item, and per board building both items on one unit. */
  private readonly items = new Map<string, Counter>();
  private readonly pairs = new Map<string, Counter>();
  /** Per board with the trait active (any breakpoint). */
  private readonly traits = new Map<string, Counter>();
  private readonly traitUnits = new Map<string, Counter>();

  add(board: ResolvedBoard) {
    const { placement } = board;
    const pairs = new Set<string>();
    for (const { items } of board.units) {
      for (const item of items) for (const other of items) if (other !== item) pairs.add(`${item}|${other}`);
    }
    for (const item of new Set(board.units.flatMap(({ items }) => items))) bump(this.items, item, placement);
    for (const pair of pairs) bump(this.pairs, pair, placement);
    const units = [...new Set(board.units.map(({ apiName }) => apiName))];
    for (const trait of new Set(board.traits.map(({ apiName }) => apiName))) {
      bump(this.traits, trait, placement);
      for (const unit of units) bump(this.traitUnits, `${trait}|${unit}`, placement);
    }
  }

  results(champions: ChampionStats[], comps: AutoComp[]): { items: ItemStats[]; traits: TraitStats[] } {
    const items = new Map<string, ItemStats>();
    for (const [item, counter] of this.items) {
      items.set(item, { apiName: item, holders: [], pairs: [], comps: [] });
      const baseline = statLine(counter, counter[0]);
      for (const [key, pair] of this.pairs) {
        const [from = "", other = ""] = key.split("|");
        if (from !== item || pair[0] < MIN_DATABASE_GAMES.pair) continue;
        items.get(item)!.pairs.push({ item: other, ...withDelta(statLine(pair, counter[0]), baseline) });
      }
    }
    // A holder's line is the champion's single-item build, so its delta is against the champion's own average.
    for (const champion of champions) {
      for (const build of champion.builds) {
        if (build.items.length === 1) items.get(build.items[0]!)?.holders.push({ unit: champion.apiName, ...build });
      }
    }

    const traits = new Map<string, TraitStats>();
    for (const [trait, counter] of this.traits) {
      const baseline = statLine(counter, counter[0]);
      const stats: TraitStats = { apiName: trait, units: [], comps: [] };
      for (const [key, unitCounter] of this.traitUnits) {
        const [from = "", unit = ""] = key.split("|");
        if (from !== trait || unitCounter[0] < MIN_DATABASE_GAMES.traitUnit) continue;
        stats.units.push({ unit, ...withDelta(statLine(unitCounter, counter[0]), baseline) });
      }
      traits.set(trait, stats);
    }

    for (const comp of comps) {
      for (const item of new Set(comp.units.flatMap((unit) => unit.items))) items.get(item)?.comps.push(comp.id);
      for (const { trait } of comp.traits) traits.get(trait)?.comps.push(comp.id);
    }
    for (const stats of items.values()) {
      stats.holders.sort(byScore);
      stats.pairs.sort(byScore);
    }
    for (const stats of traits.values()) stats.units.sort(byScore);
    return { items: [...items.values()], traits: [...traits.values()] };
  }
}

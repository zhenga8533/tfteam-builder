import type { ChampionStats, StatLine } from "../../src/lib/data/schema.ts";
import type { Counter } from "../store/types.ts";
import type { ResolvedBoard } from "./boards.ts";
import { bump as bumpCounter, counterFor, round, statLine } from "../../src/lib/game/stat-line.ts";
import { parseTraitKey, traitKey } from "../../src/lib/game/traits.ts";

/** Minimum games before a build, partner or trait is listed; larger item sets split the sample further. */
export const MIN_CHAMPION_GAMES = { build1: 50, build2: 30, build3: 20, partner: 50, trait: 50 } as const;

const BUILD_MIN = [0, MIN_CHAMPION_GAMES.build1, MIN_CHAMPION_GAMES.build2, MIN_CHAMPION_GAMES.build3];

const bump = (map: Map<string, Counter>, key: string, placement: number) =>
  bumpCounter(counterFor(map, key), placement);

/** Every distinct sub-multiset of a sorted item list, e.g. [A, A, B] → A, B, A+A, A+B, A+A+B. */
export function itemSubsets(items: string[]): string[][] {
  const subsets = new Map<string, string[]>();
  for (let mask = 1; mask < 1 << items.length; mask++) {
    const subset = items.filter((_, index) => mask & (1 << index));
    subsets.set(subset.join(","), subset);
  }
  return [...subsets.values()];
}

/** Accumulates per-champion builds, partners and traits from boards in the selected sample. */
export class ChampionAccumulator {
  private boards = 0;
  private readonly units = new Map<string, Counter>();
  private readonly instances = new Map<string, Counter>();
  private readonly stars = new Map<string, Counter>();
  private readonly builds = new Map<string, Counter>();
  private readonly partners = new Map<string, Counter>();
  private readonly traits = new Map<string, Counter>();

  add(board: ResolvedBoard) {
    const { placement } = board;
    this.boards += 1;
    const units = board.units.map(({ apiName, star, items }) => ({ unit: apiName, star, items }));
    const traits = board.traits.map(({ apiName, minUnits }) => traitKey(apiName, minUnits));

    const present = [...new Set(units.map(({ unit }) => unit))];
    for (const unit of present) {
      bump(this.units, unit, placement);
      for (const other of present) if (other !== unit) bump(this.partners, `${unit}|${other}`, placement);
      for (const trait of traits) bump(this.traits, `${unit}|${trait}`, placement);
    }
    for (const key of new Set(units.map(({ unit, star }) => `${unit}|${star}`))) bump(this.stars, key, placement);
    for (const { unit, items } of units) {
      bump(this.instances, unit, placement);
      for (const subset of itemSubsets(items)) bump(this.builds, `${unit}|${subset.join(",")}`, placement);
    }
  }

  results(): ChampionStats[] {
    const byUnit = new Map<string, ChampionStats>();
    for (const [unit, counter] of this.units) {
      byUnit.set(unit, {
        apiName: unit,
        overall: statLine(counter, this.boards, { places: true }),
        stars: {},
        builds: [],
        partners: [],
        traits: [],
        comps: [],
      });
    }
    const withDelta = (stats: ChampionStats, line: StatLine) => ({
      ...line,
      delta: round(line.avg - stats.overall.avg, 2),
    });

    for (const [key, counter] of this.stars) {
      const [unit = "", star = ""] = key.split("|");
      const stats = byUnit.get(unit);
      if (stats) stats.stars[star] = statLine(counter, stats.overall.games);
    }
    for (const [key, counter] of this.builds) {
      const [unit = "", list = ""] = key.split("|");
      const items = list.split(",");
      const stats = byUnit.get(unit);
      if (!stats || counter[0] < BUILD_MIN[items.length]!) continue;
      const instances = this.instances.get(unit)?.[0] ?? counter[0];
      stats.builds.push({ items, ...withDelta(stats, statLine(counter, instances)) });
    }
    for (const [key, counter] of this.partners) {
      const [unit = "", other = ""] = key.split("|");
      const stats = byUnit.get(unit);
      if (!stats || counter[0] < MIN_CHAMPION_GAMES.partner) continue;
      stats.partners.push({ unit: other, ...withDelta(stats, statLine(counter, stats.overall.games)) });
    }
    for (const [key, counter] of this.traits) {
      const [unit = "", breakpoint = ""] = key.split("|");
      const { apiName: trait, minUnits } = parseTraitKey(breakpoint);
      const stats = byUnit.get(unit);
      if (!stats || counter[0] < MIN_CHAMPION_GAMES.trait) continue;
      stats.traits.push({
        trait,
        minUnits,
        ...withDelta(stats, statLine(counter, stats.overall.games)),
      });
    }

    const byScore = (a: StatLine, b: StatLine) => a.score - b.score;
    for (const stats of byUnit.values()) {
      stats.builds.sort(byScore);
      stats.partners.sort(byScore);
      stats.traits.sort(byScore);
    }
    return [...byUnit.values()];
  }
}

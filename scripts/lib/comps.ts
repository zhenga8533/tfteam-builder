import type { AutoComp, SetData } from "../../src/lib/data/schema.ts";
import {
  compId,
  compSignature,
  isUniqueTrait,
  pickCarries,
  pickCoreTraits,
} from "../../src/lib/game/comp-signature.ts";
import { traitStyle } from "../../src/lib/game/traits.ts";
import type { Counter } from "../stats/types.ts";
import type { ResolvedBoard } from "./boards.ts";
import { round, statLine } from "../../src/lib/game/stat-line.ts";
import { assignTiers } from "./stats.ts";

export const COMP_THRESHOLDS = {
  /** A comp needs this many games… */
  minGames: 150,
  /** …and this share of all boards, so a flood of matches doesn't let niche boards through… */
  minPlayRate: 0.002,
  /** …and at least one first place, so it has shown it can win. */
  minWins: 1,
  /** Units on at least this share of a comp's boards form its core board. */
  coreFrequency: 0.5,
  /** Units on at least this share (but below core) are listed as flex. */
  flexFrequency: 0.2,
  maxUnits: 9,
  maxFlex: 6,
} as const;

function bump(counter: Counter, placement: number) {
  counter[0] += 1;
  counter[1] += placement;
  if (placement <= 4) counter[2] += 1;
  if (placement === 1) counter[3] += 1;
}

const increment = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

const mostCommon = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1])[0]?.[0];

const mergeCounts = (target: Map<string, number>, source: Map<string, number>) => {
  for (const [key, count] of source) target.set(key, (target.get(key) ?? 0) + count);
};

interface CompDetail {
  counter: Counter;
  units: Map<string, number>;
  stars: Map<string, number>;
  itemSets: Map<string, number>;
  instances: Map<string, number>;
  traits: Map<string, number>;
  traitBreakpoints: Map<string, number>;
  levels: Map<string, number>;
}

/**
 * Detects comps in two passes over the same boards: `count` tallies boards per signature, then
 * `add` collects details for the signatures that qualify (rare ones fold into a similar comp).
 */
export class CompDetector {
  private boards = 0;
  private readonly signatures = new Map<string, Counter>();
  private assignment: Map<string, string> | null = null;
  private readonly details = new Map<string, CompDetail>();
  private readonly data: SetData;
  private readonly costs: Map<string, number>;
  private readonly unique: Set<string>;
  private readonly championTraits: Set<string>;

  constructor(data: SetData) {
    this.data = data;
    this.costs = new Map(data.champions.map((champion) => [champion.apiName, champion.cost]));
    this.unique = new Set(data.traits.filter(isUniqueTrait).map((trait) => trait.apiName));
    this.championTraits = new Set(data.traits.filter((trait) => trait.source === "champion").map((t) => t.apiName));
  }

  signature(board: ResolvedBoard): string {
    const carries = pickCarries(
      board.units.map((unit) => ({
        apiName: unit.apiName,
        items: unit.items.length,
        cost: this.costs.get(unit.apiName) ?? 0,
      })),
    );
    const core = pickCoreTraits(
      board.traits
        .filter((trait) => this.championTraits.has(trait.apiName) && !this.unique.has(trait.apiName))
        .map((trait) => ({ apiName: trait.apiName, style: traitStyle(trait.style), count: trait.count })),
    );
    return compSignature(carries, core);
  }

  /** Pass A. */
  count(board: ResolvedBoard) {
    this.boards += 1;
    const signature = this.signature(board);
    let counter = this.signatures.get(signature);
    if (!counter) this.signatures.set(signature, (counter = [0, 0, 0, 0]));
    bump(counter, board.placement);
  }

  /**
   * Decides which signatures are comps. A signature below the thresholds folds into the largest
   * qualifying comp with the same carries and at least one shared core trait, otherwise it's dropped.
   */
  private assign(): Map<string, string> {
    // Boards with no item holder have no carry to build around, so they never form a comp.
    const qualifies = ([signature, [games, , , wins]]: [string, Counter]) =>
      !signature.startsWith("|") &&
      games >= COMP_THRESHOLDS.minGames &&
      games >= this.boards * COMP_THRESHOLDS.minPlayRate &&
      wins >= COMP_THRESHOLDS.minWins;
    const qualifying = [...this.signatures].filter(qualifies).sort((a, b) => b[1][0] - a[1][0]);
    const byCarries = Map.groupBy(qualifying, ([signature]) => signature.split("|")[0]!);

    const assignment = new Map(qualifying.map(([signature]) => [signature, signature]));
    for (const [signature] of this.signatures) {
      if (assignment.has(signature)) continue;
      const [carries = "", traits = ""] = signature.split("|");
      if (!carries) continue;
      const own = new Set(traits.split("+").filter(Boolean));
      const target = byCarries.get(carries)?.find(([candidate]) =>
        candidate
          .split("|")[1]!
          .split("+")
          .some((trait) => own.has(trait)),
      );
      if (target) assignment.set(signature, target[0]);
    }
    return assignment;
  }

  /** Pass B. */
  add(board: ResolvedBoard) {
    this.assignment ??= this.assign();
    const target = this.assignment.get(this.signature(board));
    if (!target) return;
    let detail = this.details.get(target);
    if (!detail) {
      detail = {
        counter: [0, 0, 0, 0],
        units: new Map(),
        stars: new Map(),
        itemSets: new Map(),
        instances: new Map(),
        traits: new Map(),
        traitBreakpoints: new Map(),
        levels: new Map(),
      };
      this.details.set(target, detail);
    }
    bump(detail.counter, board.placement);
    increment(detail.levels, String(board.level));
    for (const apiName of new Set(board.units.map((unit) => unit.apiName))) increment(detail.units, apiName);
    for (const unit of board.units) {
      increment(detail.instances, unit.apiName);
      increment(detail.stars, `${unit.apiName}|${unit.star}`);
      if (unit.items.length) increment(detail.itemSets, `${unit.apiName}|${unit.items.join(",")}`);
    }
    for (const trait of board.traits) {
      increment(detail.traits, trait.apiName);
      increment(detail.traitBreakpoints, `${trait.apiName}|${trait.minUnits}`);
    }
  }

  /** The core trait the comp runs at its highest breakpoint, e.g. Riftbeast in Riftbeast + Hunter. */
  private mainTrait(signature: string, detail: CompDetail): string | undefined {
    const core = (signature.split("|")[1] ?? "").split("+").filter(Boolean);
    const breakpoint = (trait: string) =>
      Number(
        mostCommon(new Map([...detail.traitBreakpoints].filter(([key]) => key.startsWith(`${trait}|`))))?.split(
          "|",
        )[1] ?? 0,
      );
    return core.sort((a, b) => breakpoint(b) - breakpoint(a))[0];
  }

  /**
   * Signatures with the same carries and main trait are one comp whose second trait varies (Riftbeast
   * Ashe with Hunter or with Inferno), so their boards are combined under the most played signature.
   */
  private merged(): { signature: string; variants: string[]; detail: CompDetail }[] {
    const groups = Map.groupBy(
      [...this.details].sort((a, b) => b[1].counter[0] - a[1].counter[0]),
      ([signature, detail]) => `${signature.split("|")[0]}|${this.mainTrait(signature, detail) ?? signature}`,
    );
    return [...groups.values()].map((group) => {
      // Map.groupBy never makes an empty group.
      const [[signature, first], ...rest] = group as [[string, CompDetail], ...[string, CompDetail][]];
      const detail: CompDetail = {
        counter: [...first.counter] as Counter,
        units: new Map(first.units),
        stars: new Map(first.stars),
        itemSets: new Map(first.itemSets),
        instances: new Map(first.instances),
        traits: new Map(first.traits),
        traitBreakpoints: new Map(first.traitBreakpoints),
        levels: new Map(first.levels),
      };
      for (const [, other] of rest) {
        other.counter.forEach((value, index) => (detail.counter[index]! += value));
        mergeCounts(detail.units, other.units);
        mergeCounts(detail.stars, other.stars);
        mergeCounts(detail.itemSets, other.itemSets);
        mergeCounts(detail.instances, other.instances);
        mergeCounts(detail.traits, other.traits);
        mergeCounts(detail.traitBreakpoints, other.traitBreakpoints);
        mergeCounts(detail.levels, other.levels);
      }
      return { signature, variants: rest.map(([variant]) => variant), detail };
    });
  }

  results(): AutoComp[] {
    const championName = new Map(this.data.champions.map((champion) => [champion.apiName, champion.name]));
    const traitsByApi = new Map(this.data.traits.map((trait) => [trait.apiName, trait]));
    const comps: AutoComp[] = [];
    const secondary = new Map<string, string>();

    for (const { signature, variants, detail } of this.merged()) {
      const games = detail.counter[0];
      const [carryPart = "", traitPart = ""] = signature.split("|");
      const carries = carryPart.split("+").filter(Boolean);
      const core = traitPart.split("+").filter(Boolean);
      const frequency = (count: number) => round(count / games, 3);
      const keysFor = (map: Map<string, number>, prefix: string) =>
        new Map(
          [...map]
            .filter(([key]) => key.startsWith(`${prefix}|`))
            .map(([key, count]) => [key.slice(prefix.length + 1), count]),
        );

      const byFrequency = [...detail.units].sort((a, b) => b[1] - a[1]);
      const coreUnits = byFrequency
        .filter(([apiName, count]) => carries.includes(apiName) || count >= games * COMP_THRESHOLDS.coreFrequency)
        .slice(0, COMP_THRESHOLDS.maxUnits);
      const units = coreUnits.map(([apiName, count]) => {
        const sets = keysFor(detail.itemSets, apiName);
        const withItems = [...sets.values()].reduce((total, value) => total + value, 0);
        // Only list items for units that usually hold some; otherwise the most common set is noise.
        const holdsItems = carries.includes(apiName) || withItems >= (detail.instances.get(apiName) ?? 0) / 2;
        return {
          apiName,
          star: Number(mostCommon(keysFor(detail.stars, apiName)) ?? 1),
          items: holdsItems ? (mostCommon(sets)?.split(",") ?? []) : [],
          frequency: frequency(count),
        };
      });
      const flex = byFrequency
        .filter(
          ([apiName, count]) =>
            !coreUnits.some(([core]) => core === apiName) && count >= games * COMP_THRESHOLDS.flexFrequency,
        )
        .slice(0, COMP_THRESHOLDS.maxFlex)
        .map(([apiName, count]) => ({ apiName, frequency: frequency(count) }));
      const traits = [...detail.traits]
        .filter(([apiName, count]) => core.includes(apiName) || count >= games * COMP_THRESHOLDS.coreFrequency)
        .flatMap(([apiName, count]) => {
          const minUnits = Number(mostCommon(keysFor(detail.traitBreakpoints, apiName)));
          return Number.isFinite(minUnits) ? [{ trait: apiName, minUnits, frequency: frequency(count) }] : [];
        })
        .sort((a, b) => b.minUnits - a.minUnits || b.frequency - a.frequency);

      const levels = [...detail.levels].flatMap(([level, count]) => Array<number>(count).fill(Number(level))).sort();
      // Signatures sort core traits alphabetically; the main one is the core trait at the highest breakpoint.
      const main = traits.find((entry) => core.includes(entry.trait))?.trait;
      const other = core.find((trait) => trait !== main);
      const mainTrait = traitsByApi.get(main ?? "")?.name;
      const carryNames = carries.map((carry) => championName.get(carry) ?? carry);
      const name = [mainTrait, carryNames.join(" & ") || traitsByApi.get(other ?? "")?.name].filter(Boolean).join(" ");

      const id = compId(signature);
      if (other) secondary.set(id, other);
      comps.push({
        id,
        signature,
        variants,
        name: name || "Flex",
        carries,
        traits,
        units,
        flex,
        level: levels[Math.floor(levels.length / 2)] ?? 8,
        ...statLine(detail.counter, this.boards),
      });
    }

    // Variants were merged above, so a shared name is rare (e.g. carries with the same name); the other core
    // trait tells them apart.
    for (const group of Map.groupBy(comps, (comp) => comp.name).values()) {
      if (group.length < 2) continue;
      for (const comp of group) {
        const label = traitsByApi.get(secondary.get(comp.id) ?? "")?.name;
        if (label) comp.name = `${comp.name} (${label})`;
      }
    }

    assignTiers(comps, COMP_THRESHOLDS.minGames);
    return comps.sort((a, b) => a.score - b.score);
  }
}

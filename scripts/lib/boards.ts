import type { SetData } from "../../src/lib/data/schema.ts";
import type { BoardRow } from "../stats/types.ts";
import { rankableItems, resolversFor } from "./stats.ts";

export interface ResolvedUnit {
  apiName: string;
  star: number;
  /** Rankable items only (components dropped), sorted, duplicates kept. */
  items: string[];
}

export interface ResolvedTrait {
  apiName: string;
  minUnits: number;
  /** CDragon breakpoint style code of the active breakpoint. */
  style: number;
  count: number;
}

export interface ResolvedBoard {
  placement: number;
  level: number;
  units: ResolvedUnit[];
  traits: ResolvedTrait[];
}

/** Maps stored rows (Riot's names) onto the site's data: forms, item variants and trait breakpoints. */
export class BoardResolver {
  private readonly resolve: ReturnType<typeof resolversFor>;
  private readonly rankable: Set<string>;
  private readonly breakpoints: Map<string, { minUnits: number; style: number }[]>;

  constructor(data: SetData) {
    this.resolve = resolversFor(data);
    this.rankable = rankableItems(data);
    this.breakpoints = new Map(data.traits.map((trait) => [trait.apiName, trait.breakpoints]));
  }

  board(row: BoardRow): ResolvedBoard {
    const [, , , placement, level, rawUnits, rawTraits] = row;
    const units = rawUnits.flatMap(([rawUnit, star, rawItems]) => {
      const apiName = this.resolve.units.resolve(rawUnit, 0);
      if (!apiName) return [];
      const items = rawItems
        .flatMap((item) => this.resolve.items.resolve(item, 0) ?? [])
        .filter((item) => this.rankable.has(item))
        .sort();
      return [{ apiName, star, items }];
    });
    const traits = rawTraits.flatMap(([rawTrait, tier, count]) => {
      const apiName = this.resolve.traits.resolve(rawTrait, 0);
      // `tier_current` counts reached breakpoints, so it is a 1-based index into them.
      const breakpoint = apiName ? this.breakpoints.get(apiName)?.[tier - 1] : undefined;
      return apiName && breakpoint ? [{ apiName, minUnits: breakpoint.minUnits, style: breakpoint.style, count }] : [];
    });
    return { placement, level, units, traits };
  }
}

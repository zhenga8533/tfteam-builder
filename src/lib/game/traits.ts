import type { Champion, Item, Trait } from "@/lib/data/schema";

export type TraitStyle = "inactive" | "bronze" | "silver" | "gold" | "prismatic" | "unique";

/** CDragon breakpoint `style` codes → in-game badge colors. */
const STYLE_CODES: Record<number, TraitStyle> = {
  1: "bronze",
  2: "silver",
  3: "silver",
  4: "unique",
  5: "gold",
  6: "prismatic",
};

/**
 * Display order of trait styles. A unique trait is always active with its one unit, so it's listed after
 * every real breakpoint but before inactive traits.
 */
export const STYLE_RANK: Record<TraitStyle, number> = {
  inactive: 0,
  unique: 0.5,
  bronze: 1,
  silver: 2,
  gold: 3,
  prismatic: 5,
};

export interface TraitState {
  trait: Trait;
  count: number;
  /** Index into `trait.breakpoints` of the active breakpoint, or -1 when inactive. */
  activeIndex: number;
  style: TraitStyle;
}

export const traitStyle = (code: number): TraitStyle => STYLE_CODES[code] ?? "bronze";

export function activeBreakpointIndex(trait: Trait, count: number): number {
  return trait.breakpoints.findLastIndex((breakpoint) => count >= breakpoint.minUnits);
}

interface UnitLike {
  apiName: string;
  items: string[];
}

/**
 * Counts each trait once per distinct champion (twice for a trait in its `traitCounts`), plus emblems that grant a trait the holder
 * doesn't already have (matching in-game rules).
 */
export function computeTraits(
  units: UnitLike[],
  championsByApi: Map<string, Champion>,
  traitsByApi: Map<string, Trait>,
  itemsByApi: Map<string, Item>,
): TraitState[] {
  const counts = new Map<string, number>();
  const increment = (trait: string, by = 1) => counts.set(trait, (counts.get(trait) ?? 0) + by);
  const seenChampions = new Set<string>();

  for (const unit of units) {
    const champion = championsByApi.get(unit.apiName);
    if (!champion) continue;
    if (!seenChampions.has(champion.apiName)) {
      seenChampions.add(champion.apiName);
      for (const trait of champion.traits) increment(trait, champion.traitCounts?.[trait] ?? 1);
    }
    const granted = new Set(unit.items.flatMap((item) => itemsByApi.get(item)?.trait ?? []));
    for (const trait of granted) if (!champion.traits.includes(trait)) increment(trait);
  }

  return [...counts.entries()]
    .flatMap(([apiName, count]) => {
      const trait = traitsByApi.get(apiName);
      if (!trait) return [];
      const activeIndex = activeBreakpointIndex(trait, count);
      const breakpoint = trait.breakpoints[activeIndex];
      const style = breakpoint ? traitStyle(breakpoint.style) : "inactive";
      return [{ trait, count, activeIndex, style }];
    })
    .sort(
      (a, b) =>
        STYLE_RANK[b.style] - STYLE_RANK[a.style] || b.count - a.count || a.trait.name.localeCompare(b.trait.name),
    );
}

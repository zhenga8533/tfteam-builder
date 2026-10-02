import type { Item } from "@/lib/data/schema";

/** Components held, by apiName (duplicates allowed). */
export type ComponentCounts = Record<string, number>;

/** Whether `recipes` (each a two-component item) can all be built from `counts` at once. */
export function canBuild(recipes: Item[], counts: ComponentCounts): boolean {
  const left = { ...counts };
  for (const item of recipes) {
    for (const part of item.composition) {
      if (!left[part]) return false;
      left[part] -= 1;
    }
  }
  return true;
}

/** Completed items with a two-component recipe that `counts` can build (each on its own). */
export function buildableItems(items: Item[], counts: ComponentCounts): Item[] {
  return items.filter((item) => item.composition.length === 2 && canBuild([item], counts));
}

/**
 * The best build of up to `size` items `counts` can make all at once, from a list of builds best first
 * (e.g. a champion's item builds ranked by placement). Builds naming items without a recipe are skipped.
 */
export function bestBuildable<T extends { items: string[] }>(
  builds: T[],
  itemsByApi: Map<string, Item>,
  counts: ComponentCounts,
  size: number,
): T | null {
  for (const build of builds) {
    if (build.items.length !== size) continue;
    const recipes = build.items.map((apiName) => itemsByApi.get(apiName));
    if (recipes.every((item) => item && item.composition.length === 2) && canBuild(recipes as Item[], counts)) {
      return build;
    }
  }
  return null;
}

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

export interface ComponentValue {
  component: Item;
  /** Average placement across the completed items it builds into, weighted by how often each is built. */
  avg: number;
  /** Completed items it builds into that have stats. */
  builds: Item[];
  /** Of those, the ones in the S or A tier. */
  strong: Item[];
}

/**
 * How valuable each component is to pick up (e.g. on carousel): the placement of the completed items it
 * builds into, weighted by how often each is built, best first. Components with no rated items are left out.
 */
export function componentValues(
  items: Item[],
  lines: Record<string, { avg: number; games: number; tier?: string } | undefined>,
): ComponentValue[] {
  const completed = items.filter((item) => item.kind === "completed" && item.composition.length === 2);
  return items
    .filter((item) => item.kind === "component")
    .flatMap((component) => {
      const builds = completed.filter((item) => item.composition.includes(component.apiName) && lines[item.apiName]);
      const games = builds.reduce((total, item) => total + lines[item.apiName]!.games, 0);
      if (games === 0) return [];
      const avg =
        builds.reduce((total, item) => total + lines[item.apiName]!.avg * lines[item.apiName]!.games, 0) / games;
      const strong = builds.filter((item) => ["S", "A"].includes(lines[item.apiName]!.tier ?? ""));
      return [{ component, avg, builds, strong }];
    })
    .sort((a, b) => a.avg - b.avg);
}

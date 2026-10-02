import type { ChampionStats } from "@/lib/data/schema";

export type Build = ChampionStats["builds"][number];

/** Removes one occurrence of each of `items` from `build`; null if `build` doesn't contain them all. */
export function remainder(build: string[], items: string[]): string[] | null {
  const rest = [...build];
  for (const item of items) {
    const index = rest.indexOf(item);
    if (index === -1) return null;
    rest.splice(index, 1);
  }
  return rest;
}

/**
 * The builds that add exactly one item to `chosen` (duplicates allowed), best first by delta.
 * With nothing chosen this is the best single items.
 */
export function nextItems(builds: Build[], chosen: string[]): { item: string; build: Build }[] {
  return builds
    .flatMap((build) => {
      if (build.items.length !== chosen.length + 1) return [];
      const rest = remainder(build.items, chosen);
      return rest?.length === 1 ? [{ item: rest[0]!, build }] : [];
    })
    .sort((a, b) => a.build.score - b.build.score);
}

/**
 * The best full build that contains `chosen` (up to `size` items), or null when no build with enough
 * games has them. Builds are ranked by sample-adjusted average placement.
 */
export function bestBuild(builds: Build[], chosen: string[], size: number): Build | null {
  return (
    builds
      .filter((build) => build.items.length === size && remainder(build.items, chosen) !== null)
      .sort((a, b) => a.score - b.score)[0] ?? null
  );
}

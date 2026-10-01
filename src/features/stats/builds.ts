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

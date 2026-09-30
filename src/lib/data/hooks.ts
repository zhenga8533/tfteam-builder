import { useSuspenseQuery } from "@tanstack/react-query";
import { useSettings } from "@/stores/settings";
import { manifestQuery, setDataQuery, statsQuery } from "./queries";
import type { Augment, Champion, Item, SetData, Trait } from "./schema";

export function useManifest() {
  return useSuspenseQuery(manifestQuery).data;
}

/** Resolves the persisted patch/set selection against what the manifest actually contains. */
export function useActiveSet() {
  const manifest = useManifest();
  const { patch, set } = useSettings();
  const patchInfo = manifest.patches[patch];
  const setNumber = set !== null && patchInfo.sets.includes(set) ? set : patchInfo.sets[0];
  if (setNumber === undefined) throw new Error(`No sets available for patch "${patch}"`);
  return { patch, set: setNumber, version: patchInfo.version, sets: patchInfo.sets };
}

export interface GameData extends SetData {
  championsByApi: Map<string, Champion>;
  traitsByApi: Map<string, Trait>;
  itemsByApi: Map<string, Item>;
  augmentsByApi: Map<string, Augment>;
}

const indexBy = <T extends { apiName: string }>(entries: T[]) =>
  new Map(entries.map((entry) => [entry.apiName, entry]));

// Shared across all callers so each set's lookup maps are built once, not per component.
const indexed = new WeakMap<SetData, GameData>();

export function useGameData(): GameData {
  const { patch, set } = useActiveSet();
  const { data } = useSuspenseQuery(setDataQuery(patch, set));
  let gameData = indexed.get(data);
  if (!gameData) {
    gameData = {
      ...data,
      championsByApi: indexBy(data.champions),
      traitsByApi: indexBy(data.traits),
      itemsByApi: indexBy(data.items),
      augmentsByApi: indexBy(data.augments),
    };
    indexed.set(data, gameData);
  }
  return gameData;
}

/** Stats for the active set, or null when none are published (or the patch is PBE). */
export function useStats() {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(statsQuery(patch, set)).data;
}

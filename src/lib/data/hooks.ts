import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSettings } from "@/stores/settings";
import { manifestQuery, setDataQuery } from "./queries";
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

export function useGameData(): GameData {
  const { patch, set } = useActiveSet();
  const { data } = useSuspenseQuery(setDataQuery(patch, set));
  return useMemo(
    () => ({
      ...data,
      championsByApi: indexBy(data.champions),
      traitsByApi: indexBy(data.traits),
      itemsByApi: indexBy(data.items),
      augmentsByApi: indexBy(data.augments),
    }),
    [data],
  );
}

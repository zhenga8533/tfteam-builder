import { useSuspenseQuery } from "@tanstack/react-query";
import { useSettings } from "@/stores/settings";
import type { Region } from "./constants";
import {
  autoCompsQuery,
  championStatsQuery,
  itemStatsQuery,
  manifestQuery,
  patchHistoryQuery,
  rankStatsQuery,
  regionStatsQuery,
  setDataQuery,
  statsQuery,
  traitStatsQuery,
} from "./queries";
import type { Augment, Champion, Item, SetData, Trait, RankFloor } from "./schema";

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
  return { patch, set: setNumber, label: patchInfo.label, sets: patchInfo.sets };
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

/**
 * Stats for the tier lists at `rank` when that floor has its own stats, otherwise the default stats.
 * Detail pages and detected comps always use the default floor.
 */
export function useTierStats(rank: RankFloor | undefined, region?: Region) {
  const { patch, set } = useActiveSet();
  const base = useStats();
  const floor = rank && base?.ranks?.includes(rank) ? rank : null;
  const area = region && base?.regions?.includes(region) ? region : null;
  const ranked = useSuspenseQuery(rankStatsQuery(patch, set, floor)).data;
  const regional = useSuspenseQuery(regionStatsQuery(patch, set, area)).data;
  // Regional stats exist at the default floor only, so a region wins over a rank.
  return regional ?? ranked ?? base;
}

/** Per-champion builds, partners and traits; null when not published (or on PBE). */
export function useChampionStats(apiName: string) {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(championStatsQuery(patch, set, apiName)).data;
}

/** An item's best holders, pairings and comps; null when not published (or on PBE). */
export function useItemStats(apiName: string) {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(itemStatsQuery(patch, set, apiName)).data;
}

/** A trait's best units and comps; null when not published (or on PBE). */
export function useTraitStats(apiName: string) {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(traitStatsQuery(patch, set, apiName)).data;
}

/** Average placement per patch for every entry; null when not published (or on PBE). */
export function usePatchHistory() {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(patchHistoryQuery(patch, set)).data;
}

/** Comps detected from match data (at `rank` when it has its own), best first; null when not published (or on PBE). */
export function useAutoComps(rank?: RankFloor) {
  const { patch, set } = useActiveSet();
  const base = useStats();
  const floor = rank && base?.ranks?.includes(rank) ? rank : null;
  return useSuspenseQuery(autoCompsQuery(patch, set, floor)).data?.comps ?? null;
}

/** The patch detected comps' `trend` compares with; undefined until a previous patch has comps. */
export function useCompTrendPatch(rank?: RankFloor) {
  const { patch, set } = useActiveSet();
  const base = useStats();
  const floor = rank && base?.ranks?.includes(rank) ? rank : null;
  return useSuspenseQuery(autoCompsQuery(patch, set, floor)).data?.trendPatch;
}

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { useSettings } from "@/stores/settings";
import { resolveActiveSet } from "./active-set";
import type { Region } from "./constants";
import {
  autoCompsQuery,
  championStatsQuery,
  itemStatsQuery,
  littleLegendsQuery,
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

/**
 * The patch and set the site shows. Deferred: after switching, pages keep showing the current set while the new one's
 * data loads, instead of suspending back to the page skeleton.
 */
export function useActiveSet() {
  const manifest = useManifest();
  const { patch, set } = useSettings();
  const shownPatch = useDeferredValue(patch);
  const shownSet = useDeferredValue(set);
  return resolveActiveSet(manifest, shownPatch, shownSet);
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
 * The patch the active set is shown at: the live or PBE patch for the current set, and for an older set the patch its
 * stats come from (null without stats), since the live patch says nothing about it. The header shows it, so the stats
 * are read without suspending: while they load or if they fail, an older set just has no patch.
 */
export function useSetPatch(): { label: string | null; final: boolean } {
  const { patch, set, label, current } = useActiveSet();
  const stats = useQuery({ ...statsQuery(patch, set), enabled: !current }).data;
  if (current) return { label, final: false };
  return { label: stats?.patch ?? null, final: Boolean(stats?.frozen) };
}

/**
 * `rank` when it has its own stats, otherwise null (the default floor). Deferred, like the region in `useTierStats`:
 * switching keeps the current stats on screen while the new ones load, instead of suspending back to the page skeleton.
 */
function useOfferedFloor(rank: RankFloor | undefined) {
  const deferred = useDeferredValue(rank);
  const base = useStats();
  return deferred && base?.ranks?.includes(deferred) ? deferred : null;
}

/**
 * Stats for the tier lists at `rank` when that floor has its own stats, otherwise the default stats.
 * Detail pages and detected comps always use the default floor.
 */
export function useTierStats(rank: RankFloor | undefined, region?: Region) {
  const { patch, set } = useActiveSet();
  const base = useStats();
  const floor = useOfferedFloor(rank);
  const deferredRegion = useDeferredValue(region);
  const area = deferredRegion && base?.regions?.includes(deferredRegion) ? deferredRegion : null;
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

/** Little Legends on the published stats' boards; null until boards record them. */
export function useLittleLegends() {
  const { patch, set } = useActiveSet();
  return useSuspenseQuery(littleLegendsQuery(patch, set)).data?.legends ?? null;
}

/** Comps detected from match data (at `rank` when it has its own), best first; null when not published (or on PBE). */
export function useAutoComps(rank?: RankFloor) {
  const { patch, set } = useActiveSet();
  const floor = useOfferedFloor(rank);
  return useSuspenseQuery(autoCompsQuery(patch, set, floor)).data?.comps ?? null;
}

/** The patch detected comps' `trend` compares with; undefined until a previous patch has comps. */
export function useCompTrendPatch(rank?: RankFloor) {
  const { patch, set } = useActiveSet();
  const floor = useOfferedFloor(rank);
  return useSuspenseQuery(autoCompsQuery(patch, set, floor)).data?.trendPatch;
}

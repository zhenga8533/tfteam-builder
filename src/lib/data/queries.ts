import { queryOptions } from "@tanstack/react-query";
import type { Region } from "./constants";
import type {
  AutoComps,
  ChampionStats,
  ItemStats,
  LittleLegends,
  Manifest,
  Patch,
  PatchHistory,
  RankFloor,
  SetData,
  SetStats,
  TraitStats,
} from "./schema";

// Data files are produced and schema-validated by scripts/build-data.ts, so the client trusts their shape.
async function fetchData<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
  return (await response.json()) as T;
}

export const manifestQuery = queryOptions({
  queryKey: ["manifest"],
  queryFn: () => fetchData<Manifest>("manifest.json"),
});

export const setDataQuery = (patch: Patch, set: number) =>
  queryOptions({
    queryKey: ["set", patch, set],
    queryFn: () => fetchData<SetData>(`${patch}/set${set}.json`),
  });

/**
 * Match stats exist only for live ranked games and only once the crawler has published them,
 * so PBE and missing files resolve to null instead of erroring.
 */
async function fetchStats<T>(patch: Patch, path: string): Promise<T | null> {
  if (patch !== "latest") return null;
  const response = await fetch(`${import.meta.env.BASE_URL}data/stats/${path}`);
  // The dev server answers unknown paths with index.html, so check the content type too.
  if (response.status === 404 || !response.headers.get("content-type")?.includes("json")) return null;
  if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
  return (await response.json()) as T;
}

/** A set's tier list stats at another rank floor; null for the default floor (see `statsQuery`). */
export const rankStatsQuery = (patch: Patch, set: number, floor: RankFloor | null) =>
  queryOptions({
    queryKey: ["stats", patch, set, "rank", floor],
    queryFn: () => (floor ? fetchStats<SetStats>(patch, `set${set}/ranks/${floor}.json`) : null),
  });

/** A set's tier list stats for one region; null when no region is chosen. */
export const regionStatsQuery = (patch: Patch, set: number, region: Region | null) =>
  queryOptions({
    queryKey: ["stats", patch, set, "region", region],
    queryFn: () => (region ? fetchStats<SetStats>(patch, `set${set}/regions/${region}.json`) : null),
  });

/** A set's tier list stats on another of its patches (see `SetStats.patches`); null for the default stats. */
export const patchStatsQuery = (patch: Patch, set: number, gamePatch: string | null) =>
  queryOptions({
    queryKey: ["stats", patch, set, "patch", gamePatch],
    queryFn: () => (gamePatch ? fetchStats<SetStats>(patch, `set${set}/patches/${gamePatch}.json`) : null),
  });

export const statsQuery = (patch: Patch, set: number) =>
  queryOptions({
    queryKey: ["stats", patch, set],
    queryFn: () => fetchStats<SetStats>(patch, `set${set}.json`),
  });

export const championStatsQuery = (patch: Patch, set: number, apiName: string) =>
  queryOptions({
    queryKey: ["stats", patch, set, "champion", apiName],
    queryFn: () => fetchStats<ChampionStats>(patch, `set${set}/champions/${apiName}.json`),
  });

export const itemStatsQuery = (patch: Patch, set: number, apiName: string) =>
  queryOptions({
    queryKey: ["stats", patch, set, "item", apiName],
    queryFn: () => fetchStats<ItemStats>(patch, `set${set}/items/${apiName}.json`),
  });

export const traitStatsQuery = (patch: Patch, set: number, apiName: string) =>
  queryOptions({
    queryKey: ["stats", patch, set, "trait", apiName],
    queryFn: () => fetchStats<TraitStats>(patch, `set${set}/traits/${apiName}.json`),
  });

export const patchHistoryQuery = (patch: Patch, set: number) =>
  queryOptions({
    queryKey: ["stats", patch, set, "history"],
    queryFn: () => fetchStats<PatchHistory>(patch, `set${set}/history.json`),
  });

export const littleLegendsQuery = (patch: Patch, set: number) =>
  queryOptions({
    queryKey: ["stats", patch, set, "little-legends"],
    queryFn: () => fetchStats<LittleLegends>(patch, `set${set}/little-legends.json`),
  });

/** Detected comps, at a rank floor with its own comps or (`null`) the default floor. */
export const autoCompsQuery = (patch: Patch, set: number, floor: RankFloor | null = null) =>
  queryOptions({
    queryKey: ["stats", patch, set, "comps", floor],
    queryFn: () => fetchStats<AutoComps>(patch, floor ? `set${set}/ranks/${floor}.comps.json` : `set${set}/comps.json`),
  });

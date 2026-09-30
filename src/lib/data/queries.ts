import { queryOptions } from "@tanstack/react-query";
import type { Manifest, Patch, SetData, SetStats } from "./schema";

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
export const statsQuery = (patch: Patch, set: number) =>
  queryOptions({
    queryKey: ["stats", patch, set],
    queryFn: async (): Promise<SetStats | null> => {
      if (patch !== "latest") return null;
      const response = await fetch(`${import.meta.env.BASE_URL}data/stats/set${set}.json`);
      // The dev server answers unknown paths with index.html, so check the content type too.
      if (response.status === 404 || !response.headers.get("content-type")?.includes("json")) return null;
      if (!response.ok) throw new Error(`Failed to load stats (${response.status})`);
      return (await response.json()) as SetStats;
    },
  });

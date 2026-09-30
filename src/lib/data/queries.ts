import { queryOptions } from "@tanstack/react-query";
import type { Manifest, Patch, SetData } from "./schema";

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

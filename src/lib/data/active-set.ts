import type { QueryClient } from "@tanstack/react-query";
import { useSettings } from "@/stores/settings";
import { setDataQuery, statsQuery } from "./queries";
import type { Manifest, Patch } from "./schema";

/** Resolves the persisted patch/set selection against what the manifest actually contains. */
export function resolveActiveSet(manifest: Manifest, patch: Patch, set: number | null) {
  const patchInfo = manifest.patches[patch];
  const setNumber = set !== null && patchInfo.sets.includes(set) ? set : patchInfo.sets[0];
  if (setNumber === undefined) throw new Error(`No sets available for patch "${patch}"`);
  return { patch, set: setNumber, label: patchInfo.label, sets: patchInfo.sets };
}

/**
 * Loads the active set's game data and stats, which nearly every page reads. Never rejects: a page that needs
 * them reports a failed load through its own query.
 */
export async function prefetchActiveSet(queryClient: QueryClient, manifest: Manifest) {
  const { patch, set } = useSettings.getState();
  const active = resolveActiveSet(manifest, patch, set);
  await Promise.all([
    queryClient.prefetchQuery(setDataQuery(active.patch, active.set)),
    queryClient.prefetchQuery(statsQuery(active.patch, active.set)),
  ]);
}

import type { QueryClient } from "@tanstack/react-query";
import { useSettings } from "@/stores/settings";
import { setDataQuery, statsQuery } from "./queries";
import type { Manifest, Patch } from "./schema";

/**
 * Resolves the persisted patch/set selection against what the manifest actually contains. `sets` are the chosen
 * patch's; `current` is whether the set is that patch's newest, the one its label describes.
 */
export function resolveActiveSet(manifest: Manifest, patch: Patch, set: number | null) {
  const patchInfo = manifest.patches[patch];
  const setNumber = set !== null && patchInfo.sets.includes(set) ? set : patchInfo.sets[0];
  if (setNumber === undefined) throw new Error(`No sets available for patch "${patch}"`);
  // The PBE only changes its newest set, so older sets show live data: the same game data, plus stats.
  const shown: Patch =
    patch === "pbe" && setNumber !== patchInfo.sets[0] && manifest.patches.latest.sets.includes(setNumber)
      ? "latest"
      : patch;
  const shownInfo = manifest.patches[shown];
  return {
    patch: shown,
    set: setNumber,
    label: shownInfo.label,
    current: setNumber === shownInfo.sets[0],
    sets: patchInfo.sets,
  };
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

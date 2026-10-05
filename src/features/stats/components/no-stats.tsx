import { EmptyState } from "@/components/layout/empty-state";
import { useActiveSet, useStats } from "@/lib/data/hooks";

/**
 * Why a page has no match stats: PBE, or a set from before collection started. Nothing while the set is still
 * collecting, since every page's stats line (`StatsMeta`) already says so.
 */
export function NoStats({ subject }: { subject?: string }) {
  const { patch, set, sets } = useActiveSet();
  const collecting = useStats()?.status === "collecting";
  const newest = sets[0];
  if (collecting) return null;
  return (
    <EmptyState>
      {patch === "pbe"
        ? "Match stats come from live ranked games, so they aren't available on PBE."
        : set !== newest
          ? `Riot's match history only reaches back a few weeks, so there are no match stats for Set ${set}.`
          : `No match stats for ${subject ?? `Set ${set}`} yet.`}
    </EmptyState>
  );
}

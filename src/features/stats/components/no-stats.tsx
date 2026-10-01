import { EmptyState } from "@/components/layout/empty-state";
import { useActiveSet } from "@/lib/data/hooks";

/** Why a page has no match stats: PBE, a set from before collection started, or a set still collecting. */
export function NoStats({ subject }: { subject?: string }) {
  const { patch, set, sets } = useActiveSet();
  const newest = sets[0];
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

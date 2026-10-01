import { useAutoComps } from "@/lib/data/hooks";
import { AutoCompCard } from "./comp-card";

/** Cards for the detected comps with these IDs, in tier-list order; nothing when none are published. */
export function AutoCompList({ ids }: { ids: string[] }) {
  const comps = (useAutoComps() ?? []).filter((comp) => ids.includes(comp.id));
  if (comps.length === 0) return null;
  return (
    <div className="grid gap-2 xl:grid-cols-2">
      {comps.map((comp) => (
        <AutoCompCard key={comp.id} comp={comp} />
      ))}
    </div>
  );
}

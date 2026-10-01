import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useActiveSet } from "@/lib/data/hooks";
import { useSettings } from "@/stores/settings";

/** Content is authored per set; only render it when that set's game data is the active one. */
export function SetGuard({ set, children, fallback }: { set: number; children: ReactNode; fallback?: ReactNode }) {
  const { set: activeSet, sets } = useActiveSet();
  const setActiveSet = useSettings((state) => state.setSet);

  if (set === activeSet) return children;
  if (fallback !== undefined) return fallback;
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <p className="text-muted-foreground">
        This content is for Set {set}, but you're viewing Set {activeSet}.
      </p>
      {sets.includes(set) && (
        <Button variant="secondary" onClick={() => setActiveSet(set === sets[0] ? null : set)}>
          Switch to Set {set}
        </Button>
      )}
    </div>
  );
}

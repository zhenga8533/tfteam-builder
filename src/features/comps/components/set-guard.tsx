import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { SwitchSetButton } from "@/components/game/switch-set-button";
import { NotFoundState } from "@/components/layout/not-found-state";
import { useActiveSet } from "@/lib/data/hooks";

/** Content is authored per set; only render it when that set's game data is the active one. */
export function SetGuard({ set, children, fallback }: { set: number; children: ReactNode; fallback?: ReactNode }) {
  const { set: activeSet } = useActiveSet();
  if (set === activeSet) return children;
  if (fallback !== undefined) return fallback;
  return (
    <NotFoundState
      icon={BookOpen}
      title={`Written for Set ${set}`}
      description={`You're viewing Set ${activeSet}.`}
      heading="h2"
    >
      <SwitchSetButton set={set} />
    </NotFoundState>
  );
}

import type { ReactNode } from "react";
import { GameHoverCard } from "@/components/game/game-hover-card";
import type { StatLine } from "@/lib/data/schema";
import { AvgPlacement, StatSummary } from "./stat-summary";

interface TierEntryProps {
  icon: ReactNode;
  label: string;
  line: StatLine | undefined;
  card: ReactNode;
}

/** Icon, name and average placement, with the full game card (plus stats) on hover. */
export function TierEntry({ icon, label, line, card }: TierEntryProps) {
  return (
    <GameHoverCard
      content={
        <div className="space-y-3">
          {card}
          {line && <StatSummary line={line} className="border-t pt-3" />}
        </div>
      }
    >
      <span
        tabIndex={0}
        className="flex w-16 flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {icon}
        <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">{label}</span>
        {line && <AvgPlacement line={line} className="text-xs" />}
      </span>
    </GameHoverCard>
  );
}

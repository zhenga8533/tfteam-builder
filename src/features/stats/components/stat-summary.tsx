import type { StatLine } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { avgPlacementClass, count, percent } from "../format";

export function AvgPlacement({ line, className }: { line: StatLine; className?: string }) {
  return (
    <span
      className={cn("font-semibold tabular-nums", avgPlacementClass(line.avg), className)}
      title="Average placement, adjusted for sample size"
    >
      {line.avg.toFixed(2)}
    </span>
  );
}

/** One-line stat readout: average placement, top-4 rate and games. */
export function StatSummary({ line, className }: { line: StatLine; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground", className)}>
      <span>
        <AvgPlacement line={line} /> avg
      </span>
      <span>{percent(line.top4)} top 4</span>
      <span>{count(line.games)} games</span>
    </span>
  );
}

import type { StatLine } from "@/lib/data/schema";
import { isLowSample, LOW_SAMPLE_GAMES } from "@/lib/game/stat-line";
import { cn } from "@/lib/utils";
import { avgPlacementClass, count, percent, share } from "../format";

export const LOW_SAMPLE_HINT = `Fewer than ${LOW_SAMPLE_GAMES} games, so this average can change a lot`;

/** Low samples are left uncolored so a lucky handful of games doesn't read as strong or weak. */
export function AvgPlacement({ line, className }: { line: StatLine; className?: string }) {
  const low = isLowSample(line);
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        low ? "text-muted-foreground" : avgPlacementClass(line.avg),
        className,
      )}
      title={low ? LOW_SAMPLE_HINT : "Average placement"}
    >
      {line.avg.toFixed(2)}
    </span>
  );
}

/** One-line stat readout: average placement, top-4 rate and games. */
export function StatSummary({
  line,
  className,
  play,
}: {
  line: StatLine;
  className?: string;
  /** Shows the play rate with this wording, e.g. "of games"; what `play` is a share of differs by kind. */
  play?: string;
}) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground", className)}>
      <span>
        <AvgPlacement line={line} /> avg
      </span>
      <span>{percent(line.top4)} top 4</span>
      <span>{count(line.games)} games</span>
      {play && (
        <span>
          {share(line.play)} {play}
        </span>
      )}
      {isLowSample(line) && (
        <span className="text-[10px] font-semibold tracking-wide uppercase" title={LOW_SAMPLE_HINT}>
          Low sample
        </span>
      )}
    </span>
  );
}

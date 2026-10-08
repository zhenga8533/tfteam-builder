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

/**
 * Marks a stat with too few games to trust. Muted with a dashed outline, like the tier lists' low sample section:
 * uncertain rather than bad, which the site's orange and red already mean.
 */
export function LowSampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed px-1.5 text-[10px] leading-4 font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
      title={LOW_SAMPLE_HINT}
    >
      Low sample
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
      {isLowSample(line) && <LowSampleBadge />}
    </span>
  );
}

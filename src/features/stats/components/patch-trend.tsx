import { ArrowDown, ArrowUp } from "lucide-react";
import { usePatchHistory } from "@/lib/data/hooks";
import type { PatchHistory, PatchTrend } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { MIN_TREND } from "../format";

/**
 * Change in average placement since the previous patch. Lower placements are better, so a negative
 * change shows as an improvement (green, pointing up).
 */
export function TrendBadge({ delta, patch, className }: { delta?: number; patch?: string; className?: string }) {
  if (delta === undefined || Math.abs(delta) < MIN_TREND) return null;
  const better = delta < 0;
  const Icon = better ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold tabular-nums",
        better ? "text-cost-2" : "text-destructive",
        className,
      )}
      title={`Average placement ${better ? "improved" : "worsened"} by ${Math.abs(delta).toFixed(2)} since patch ${patch}`}
    >
      <Icon className="size-3" />
      {Math.abs(delta).toFixed(2)}
    </span>
  );
}

type HistoryKind = keyof Omit<PatchHistory, "patches">;

/**
 * The trend badge for one stats entry (`traits` keys are `apiName:minUnits`), from `trend`: the trend of the stats
 * shown alongside, so a chosen rank floor or region compares like with like.
 */
export function StatTrend({
  trend,
  kind,
  entry,
  className,
}: {
  trend: PatchTrend | undefined;
  kind: keyof Omit<PatchTrend, "patch">;
  entry: string;
  className?: string;
}) {
  return <TrendBadge delta={trend?.[kind][entry]} patch={trend?.patch} className={className} />;
}

const WIDTH = 240;
const HEIGHT = 64;
const PAD = 6;

/** A small line chart of an entry's average placement over the patches with saved stats. */
export function PatchHistoryChart({ kind, entry }: { kind: HistoryKind; entry: string }) {
  const history = usePatchHistory();
  const values = history?.[kind][entry];
  const points = (values ?? [])
    .map((avg, index) => ({ avg, patch: history!.patches[index]! }))
    .filter((point): point is { avg: number; patch: string } => point.avg !== null);
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Trends appear once there are stats for more than one patch.</p>;
  }

  const averages = points.map((point) => point.avg);
  // Keep at least half a placement of range so small wobbles don't look dramatic.
  const low = Math.min(...averages, 4.5) - 0.25;
  const high = Math.max(...averages, 4.5) + 0.25;
  const x = (index: number) => PAD + (index / (points.length - 1)) * (WIDTH - PAD * 2);
  // Better placements (lower numbers) are drawn higher.
  const y = (avg: number) => PAD + ((avg - low) / (high - low)) * (HEIGHT - PAD * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.avg)}`).join(" ");

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Average placement by patch">
        <line x1={PAD} x2={WIDTH - PAD} y1={y(4.5)} y2={y(4.5)} className="stroke-border" strokeDasharray="3 3" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2} />
        {points.map((point, index) => (
          <circle key={point.patch} cx={x(index)} cy={y(point.avg)} r={3} className="fill-primary">
            <title>{`${point.patch}: ${point.avg.toFixed(2)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        {points.map((point) => (
          <span key={point.patch}>
            {point.patch} <span className="text-foreground">{point.avg.toFixed(2)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

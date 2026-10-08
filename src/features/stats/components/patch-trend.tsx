import { ArrowDown, ArrowUp } from "lucide-react";
import { usePatchHistory, useStats } from "@/lib/data/hooks";
import type { PatchTrend } from "@/lib/data/schema";
import { traitKey } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { MIN_TREND, share } from "../format";

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

type HistoryKind = "units" | "items" | "traits";

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
  kind: HistoryKind;
  entry: string;
  className?: string;
}) {
  return <TrendBadge delta={trend?.[kind][entry]} patch={trend?.patch} className={className} />;
}

/** A change in play rate, in percentage points, colored like `TrendBadge` (more play is green). */
export function PlayTrend({ change, className }: { change: number; className?: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        change > 0 ? "text-cost-2" : "text-destructive",
        className,
      )}
      title="Change in play rate, in percentage points"
    >
      {change > 0 ? "+" : "−"}
      {share(Math.abs(change)).replace("%", "")} pts
    </span>
  );
}

const WIDTH = 240;
const HEIGHT = 48;
const PAD = 5;

interface Point {
  patch: string;
  value: number;
}

/** One small line chart over the patches, with an optional dashed reference line. */
function Sparkline({
  points,
  y,
  reference,
  label,
  format,
}: {
  points: Point[];
  /** Maps a value to its height in the chart, top = 0. */
  y: (value: number) => number;
  reference?: number;
  label: string;
  format: (value: number) => string;
}) {
  const x = (index: number) => PAD + (index / Math.max(points.length - 1, 1)) * (WIDTH - PAD * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  return (
    <figure className="space-y-0.5">
      <figcaption className="text-[11px] text-muted-foreground">{label}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${label} by patch`}>
        {reference !== undefined && (
          <line
            x1={PAD}
            x2={WIDTH - PAD}
            y1={y(reference)}
            y2={y(reference)}
            className="stroke-border"
            strokeDasharray="3 3"
          />
        )}
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2} />
        {points.map((point, index) => (
          <circle key={point.patch} cx={x(index)} cy={y(point.value)} r={3} className="fill-primary">
            <title>{`${point.patch}: ${format(point.value)}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}

const avgText = (avg: number) => avg.toFixed(2);

/**
 * An entry's change since the previous patch (average placement and play rate, before → after), then both over every
 * patch with saved stats.
 */
export function PatchHistoryChart({ kind, entry }: { kind: HistoryKind; entry: string }) {
  const history = usePatchHistory();
  const stats = useStats();
  const trend = stats?.trend;
  const now = kind === "traits" ? undefined : stats?.[kind][entry];
  const traitNow =
    kind === "traits" ? stats?.traits.find((line) => traitKey(line.trait, line.minUnits) === entry) : undefined;
  const line = now ?? traitNow;
  const before = trend?.before?.[kind][entry];

  const patches = history?.patches ?? [];
  const avgs = history?.[kind][entry] ?? [];
  const plays = history?.play?.[kind][entry] ?? [];
  const columns = patches.map((patch, index) => ({ patch, avg: avgs[index] ?? null, play: plays[index] ?? null }));
  const avgPoints = columns.flatMap(({ patch, avg }) => (avg === null ? [] : [{ patch, value: avg }]));
  const playPoints = columns.flatMap(({ patch, play }) => (play === null ? [] : [{ patch, value: play }]));

  const averages = avgPoints.map((point) => point.value);
  // Keep at least half a placement of range so small wobbles don't look dramatic; better (lower) is drawn higher.
  const low = Math.min(...averages, 4.5) - 0.25;
  const high = Math.max(...averages, 4.5) + 0.25;
  const avgY = (avg: number) => PAD + ((avg - low) / (high - low)) * (HEIGHT - PAD * 2);
  // Play rates from zero, so a drop to half reads as half.
  const top = Math.max(...playPoints.map((point) => point.value), 0.01) * 1.1;
  const playY = (play: number) => HEIGHT - PAD - (play / top) * (HEIGHT - PAD * 2);

  return (
    <div className="space-y-3">
      {trend && line && before && (
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[11px] text-muted-foreground">Avg place since {trend.patch}</dt>
            <dd className="flex items-center gap-1.5 tabular-nums">
              {avgText(before[0])} → <span className="font-medium">{avgText(line.avg)}</span>
              <TrendBadge delta={trend[kind][entry]} patch={trend.patch} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Play rate since {trend.patch}</dt>
            <dd className="flex items-center gap-1.5 tabular-nums">
              {share(before[1])} → <span className="font-medium">{share(line.play)}</span>
              {Math.abs(line.play - before[1]) >= 0.001 && <PlayTrend change={line.play - before[1]} />}
            </dd>
          </div>
        </dl>
      )}
      {avgPoints.length < 2 ? (
        <p className="text-sm text-muted-foreground">Trends appear once there are stats for more than one patch.</p>
      ) : (
        <>
          <Sparkline points={avgPoints} y={avgY} reference={4.5} label="Average placement" format={avgText} />
          {playPoints.length >= 2 && <Sparkline points={playPoints} y={playY} label="Play rate" format={share} />}
          <table className="w-full text-[11px] tabular-nums">
            <tbody>
              {(
                [
                  ["Patch", (column: (typeof columns)[number]) => column.patch],
                  ["Avg", (column: (typeof columns)[number]) => (column.avg === null ? "–" : avgText(column.avg))],
                  ["Play", (column: (typeof columns)[number]) => (column.play === null ? "–" : share(column.play))],
                ] as const
              ).map(([label, value]) => (
                <tr key={label}>
                  <th scope="row" className="pr-2 text-left font-normal text-muted-foreground">
                    {label}
                  </th>
                  {columns.map((column) => (
                    <td key={column.patch} className={cn("text-right", label === "Patch" && "text-muted-foreground")}>
                      {value(column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

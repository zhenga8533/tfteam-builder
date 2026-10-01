import { ArrowDown, ArrowUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { StatLine } from "@/lib/data/schema";
import { isLowSample } from "@/lib/game/stat-line";
import { cn } from "@/lib/utils";
import { count, percent } from "../format";
import { AvgPlacement, LOW_SAMPLE_HINT } from "./stat-summary";

export interface StatRow {
  key: string;
  label: ReactNode;
  line: StatLine & { delta?: number };
}

type SortKey = "delta" | "avg" | "top4" | "games";

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: "delta", label: "Δ" },
  { key: "avg", label: "Avg", title: "Average placement" },
  { key: "top4", label: "Top 4", title: "Top 4 rate" },
  { key: "games", label: "Games", title: "Number of games" },
];

/** Lower is better for delta and average placement; higher is better for the rest. */
const ASCENDING_BEST: Record<SortKey, boolean> = { delta: true, avg: true, top4: false, games: false };

export function DeltaValue({ delta }: { delta: number }) {
  return (
    <span
      className={cn("font-semibold tabular-nums", delta < -0.05 ? "text-cost-2" : delta > 0.05 && "text-destructive")}
    >
      {delta > 0 ? "+" : ""}
      {delta.toFixed(2)}
    </span>
  );
}

interface StatTableProps {
  rows: StatRow[];
  /** Hide the Δ column when rows have no baseline to compare against. */
  showDelta?: boolean;
  /** What Δ is measured against, shown as the column tooltip. */
  deltaBaseline?: string;
  empty?: ReactNode;
  limit?: number;
}

/** Sortable table of stat lines; best first by delta (or average placement without deltas), low samples last. */
export function StatTable({
  rows,
  showDelta = true,
  deltaBaseline = "the champion's own average placement",
  empty = "Not enough games yet.",
  limit = 15,
}: StatTableProps) {
  const [sort, setSort] = useState<SortKey>(showDelta ? "delta" : "avg");
  const [expanded, setExpanded] = useState(false);
  const columns = COLUMNS.filter((column) => showDelta || column.key !== "delta");

  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;

  const value = (row: StatRow) => (sort === "delta" ? (row.line.delta ?? 0) : row.line[sort]);
  // Rows sort by the value shown, but low samples always go last so a few lucky games can't top the table.
  const sorted = [...rows].sort(
    (a, b) =>
      Number(isLowSample(a.line)) - Number(isLowSample(b.line)) ||
      (ASCENDING_BEST[sort] ? value(a) - value(b) : value(b) - value(a)),
  );
  const visible = expanded ? sorted : sorted.slice(0, limit);

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1.5 text-left font-medium" />
            {columns.map((column) => (
              <th
                key={column.key}
                className="w-16 py-1.5 text-right font-medium"
                title={column.key === "delta" ? `Difference from ${deltaBaseline} (lower is better)` : column.title}
              >
                <button
                  type="button"
                  onClick={() => setSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-0.5 hover:text-foreground",
                    sort === column.key && "text-foreground",
                  )}
                >
                  {column.label}
                  {sort === column.key &&
                    (ASCENDING_BEST[column.key] ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr
              key={row.key}
              className={cn("border-t", isLowSample(row.line) && "opacity-60")}
              title={isLowSample(row.line) ? LOW_SAMPLE_HINT : undefined}
            >
              <td className="py-1.5 pr-2">{row.label}</td>
              {showDelta && (
                <td className="py-1.5 text-right">
                  {row.line.delta !== undefined && <DeltaValue delta={row.line.delta} />}
                </td>
              )}
              <td className="py-1.5 text-right">
                <AvgPlacement line={row.line} />
              </td>
              <td className="py-1.5 text-right text-muted-foreground tabular-nums">{percent(row.line.top4)}</td>
              <td className="py-1.5 text-right text-muted-foreground tabular-nums">{count(row.line.games)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {expanded ? "Show less" : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

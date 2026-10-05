import { ArrowDown, ArrowUp } from "lucide-react";
import { SearchInput } from "@/components/layout/search-input";
import { type ReactNode, useState } from "react";
import type { StatLine } from "@/lib/data/schema";
import { isLowSample } from "@/lib/game/stat-line";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";
import { count, percent, share } from "../format";
import { AvgPlacement, LOW_SAMPLE_HINT } from "./stat-summary";

export interface StatRow {
  key: string;
  label: ReactNode;
  line: StatLine & { delta?: number };
  /** What the table's search matches, e.g. the champion's name. */
  name?: string;
}

type SortKey = "delta" | "avg" | "top4" | "play" | "games";

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: "delta", label: "Δ" },
  { key: "avg", label: "Avg", title: "Average placement" },
  { key: "top4", label: "Top 4", title: "Top 4 rate" },
  { key: "play", label: "Play" },
  { key: "games", label: "Games", title: "Number of games" },
];

/** Lower is better for delta and average placement; higher is better for the rest. */
const ASCENDING_BEST: Record<SortKey, boolean> = { delta: true, avg: true, top4: false, play: false, games: false };

/** Sorts by the value shown, but low samples always go last so a few lucky games can't top the table. */
function sortRows(rows: StatRow[], sort: SortKey) {
  const value = (row: StatRow) => (sort === "delta" ? (row.line.delta ?? 0) : row.line[sort]);
  return [...rows].sort(
    (a, b) =>
      Number(isLowSample(a.line)) - Number(isLowSample(b.line)) ||
      (ASCENDING_BEST[sort] ? value(a) - value(b) : value(b) - value(a)),
  );
}

function DeltaValue({ delta }: { delta: number }) {
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
  /** What each row's play rate is a share of (e.g. "Ahri's games"); adds the Play column. */
  playBaseline?: string;
  empty?: ReactNode;
  limit?: number;
  /** Keep the rows' own order until a column is picked (e.g. trait breakpoints, smallest first). */
  keepOrder?: boolean;
  /** Adds a search box with this placeholder, matching rows' `name`, when there are more rows than `limit`. */
  search?: string;
}

/** Sortable table of stat lines; best first by delta (or average placement without deltas), low samples last. */
export function StatTable({
  rows,
  showDelta = true,
  deltaBaseline = "the champion's own average placement",
  playBaseline,
  empty = "Not enough games yet.",
  limit = 15,
  keepOrder = false,
  search,
}: StatTableProps) {
  const [sort, setSort] = useState<SortKey | null>(keepOrder ? null : showDelta ? "delta" : "avg");
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const columns = COLUMNS.filter(
    (column) => (showDelta || column.key !== "delta") && (playBaseline !== undefined || column.key !== "play"),
  );

  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;

  const searchable = search !== undefined && rows.length > limit;
  const found = searchable && query ? rows.filter((row) => matches(row.name ?? "", query)) : rows;
  const sorted = sort === null ? found : sortRows(found, sort);
  // A search shows every match rather than the first `limit`.
  const visible = expanded || (searchable && query) ? sorted : sorted.slice(0, limit);

  return (
    // Narrow tables (phones, half-width cards, side panels) drop the Top 4 column to leave room for names.
    <div className="@container space-y-2">
      {searchable && <SearchInput value={query} onChange={setQuery} placeholder={search} className="max-w-xs" />}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-1.5 text-left font-medium">
              <span className="sr-only">Name</span>
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort === column.key ? (ASCENDING_BEST[column.key] ? "ascending" : "descending") : undefined}
                className={cn(
                  "w-12 py-1.5 pl-2 text-right font-medium sm:w-16",
                  column.key === "top4" && "@max-md:hidden",
                )}
                title={
                  column.key === "delta"
                    ? `Difference from ${deltaBaseline} (lower is better)`
                    : column.key === "play"
                      ? `Share of ${playBaseline}`
                      : column.title
                }
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
              <th scope="row" className="max-w-0 py-1.5 pr-2 text-left font-normal">
                {row.label}
              </th>
              {showDelta && (
                <td className="py-1.5 pl-2 text-right">
                  {row.line.delta !== undefined && <DeltaValue delta={row.line.delta} />}
                </td>
              )}
              <td className="py-1.5 pl-2 text-right">
                <AvgPlacement line={row.line} />
              </td>
              <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums @max-md:hidden">
                {percent(row.line.top4)}
              </td>
              {playBaseline !== undefined && (
                <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums">{share(row.line.play)}</td>
              )}
              <td className="py-1.5 pl-2 text-right text-muted-foreground tabular-nums">{count(row.line.games)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>}
      {sorted.length > limit && !(searchable && query) && (
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

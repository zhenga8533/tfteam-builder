import { Link } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { explorerUrl } from "@/features/explorer/explorer-url";
import { useSimilarBoards } from "@/features/explorer/use-explorer";
import type { ExplorerFilter } from "@/lib/explorer/engine";
import { EXPLORER_FILES } from "@/lib/explorer/files";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { count, percent } from "@/features/stats/format";
import { useActiveSet } from "@/lib/data/hooks";
import { statsQuery } from "@/lib/data/queries";
import { useBoardSummary } from "../use-builder";

/** Comparing needs a few units; the Explorer's similarity search needs at least three shared. */
const MIN_UNITS = 3;
/** Units carried over to the Explorer when following the link. */
const EXPLORE_UNITS = 3;

/** How ranked boards like the one being built place, from the Explorer's sample of recent games. */
export function BoardInsight() {
  const { patch, set } = useActiveSet();
  // Not suspending: the builder works without stats; this strip just stays hidden.
  const stats = useQuery(statsQuery(patch, set)).data;
  const { units } = useBoardSummary();
  const names = [...new Set(units.filter((unit) => !unit.flex).map((unit) => unit.apiName))].sort();
  const url = patch === "latest" && stats?.status === "ready" ? explorerUrl(set, EXPLORER_FILES.sample) : null;
  const { status, similar } = useSimilarBoards(url, names.length >= MIN_UNITS ? names : null);
  // Requiring every unit would usually match nothing, so the Explorer starts from the main item holders.
  const explorerFilters: ExplorerFilter[] = units
    .filter((unit) => !unit.flex)
    .toSorted((a, b) => b.items.length - a.items.length)
    .slice(0, EXPLORE_UNITS)
    .map((unit) => ({ type: "unit", unit: unit.apiName }));

  if (!url || names.length < MIN_UNITS || status.state === "missing" || status.state === "error") return null;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-card/60 px-3 py-2 text-sm">
      <BarChart3 className="size-4 shrink-0 text-muted-foreground" />
      {status.state === "loading" ? (
        <span className="text-muted-foreground">Comparing with ranked boards…</span>
      ) : similar ? (
        <>
          <span className="text-muted-foreground">
            Ranked boards with {similar.shared === similar.total ? "all" : `${similar.shared} of`} {similar.total} of
            these units:
          </span>
          <span>
            <AvgPlacement line={similar.line} /> avg
          </span>
          <span className="text-muted-foreground">
            {percent(similar.line.top4)} top 4 · {count(similar.line.games)} games
          </span>
          <Link
            to="/explorer"
            search={{ filters: explorerFilters }}
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Explore
          </Link>
        </>
      ) : (
        <span className="text-muted-foreground">Not enough ranked boards share these units to compare yet.</span>
      )}
    </p>
  );
}

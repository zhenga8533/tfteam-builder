import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ExplorerResults } from "@/features/explorer/components/explorer-results";
import { FilterBar } from "@/features/explorer/components/filter-bar";
import { explorerUrl } from "@/features/explorer/explorer-url";
import { useExplorer } from "@/features/explorer/use-explorer";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { prefetchActiveSet } from "@/lib/data/active-set";
import { RANK_OPTIONS } from "@/lib/data/constants";
import { parseRank } from "@/features/stats/scope";
import { useActiveSet, useGameData, useStats, useTierStats } from "@/lib/data/hooks";
import { manifestQuery } from "@/lib/data/queries";
import type { RankFloor } from "@/lib/data/schema";
import type { ExplorerFilter } from "@/lib/explorer/engine";
import { explorerFiles, explorerSource } from "@/lib/explorer/files";
import { cn } from "@/lib/utils";

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Keeps only well-formed filters from the URL. */
function parseFilters(value: unknown): ExplorerFilter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: Record<string, unknown>): ExplorerFilter[] => {
    if (entry?.type === "unit" && isString(entry.unit)) {
      const items = Array.isArray(entry.items) ? entry.items.filter(isString).slice(0, 3) : undefined;
      return [{ type: "unit", unit: entry.unit, minStar: isNumber(entry.minStar) ? entry.minStar : undefined, items }];
    }
    if (entry?.type === "trait" && isString(entry.trait) && isNumber(entry.minUnits)) {
      return [{ type: "trait", trait: entry.trait, minUnits: entry.minUnits }];
    }
    if (entry?.type === "level" && isNumber(entry.min)) return [{ type: "level", min: entry.min }];
    return [];
  });
}

export const Route = createFileRoute("/explorer")({
  head: () => ({ meta: [{ title: "Explorer · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): { filters?: ExplorerFilter[]; rank?: RankFloor } => {
    const filters = parseFilters(search.filters);
    return { ...(filters.length && { filters }), rank: parseRank(search.rank) };
  },
  // The filter bar reads game data only once the sample loads; without it cached, the page would suspend after appearing.
  loader: async ({ context: { queryClient } }) =>
    prefetchActiveSet(queryClient, await queryClient.ensureQueryData(manifestQuery)),
  component: ExplorerPage,
});

function ExplorerPage() {
  const { patch, set } = useActiveSet();
  const stats = useStats();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const filters = search.filters ?? [];
  // The Explorer's files hold every offered rank floor; the chosen one (or the default) picks their boards.
  const floorStats = useTierStats(search.rank);
  const { championsByApi, traitsByApi } = useGameData();
  const source = explorerSource(filters);
  // Who the boards are about ("Ahri", "Blossom"); null for every board.
  const subject =
    source.type === "champion"
      ? (championsByApi.get(source.apiName)?.name ?? source.apiName)
      : source.type === "trait"
        ? (traitsByApi.get(source.apiName)?.name ?? source.apiName)
        : null;
  const urls =
    patch === "latest" && stats?.status === "ready" && floorStats
      ? explorerFiles(source, floorStats.rankFloor).map((path) => explorerUrl(set, path, stats.frozen))
      : null;
  const floor = floorStats ? RANK_OPTIONS.indexOf(floorStats.rankFloor) : undefined;
  const { status, result, pending } = useExplorer(urls, filters, floor);

  const setFilters = (next: ExplorerFilter[]) =>
    navigate({ search: (previous) => ({ ...previous, filters: next.length ? next : undefined }), replace: true });

  return (
    <>
      <PageHeader
        title="Explorer"
        description="Filter ranked boards by champions, items, traits and level, then see what else does well with them."
      />
      {floorStats && (
        <StatsMeta
          stats={floorStats}
          onRankChange={(rank) => navigate({ search: (previous) => ({ ...previous, rank }), replace: true })}
        />
      )}
      {!urls || (status.state === "missing" && source.type === "totals") ? (
        <NoStats subject={`Set ${set}`} />
      ) : status.state === "error" ? (
        <EmptyState>Couldn't load the boards: {status.message}</EmptyState>
      ) : result === undefined ? (
        <p className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading boards…
        </p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <FilterBar filters={filters} onChange={setFilters} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {pending && status.state === "loading" ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Loading the boards{subject && ` with ${subject}`}…
                </>
              ) : (
                `Results include every ranked board${subject ? ` with ${subject}` : ""}.`
              )}
            </p>
          </div>
          {result ? (
            <div className={cn("transition-opacity", pending && "opacity-60")}>
              <ExplorerResults result={result} filters={filters} onChange={setFilters} trend={floorStats?.trend} />
            </div>
          ) : (
            <EmptyState>No boards match these filters.</EmptyState>
          )}
        </div>
      )}
    </>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ExplorerResults } from "@/features/explorer/components/explorer-results";
import { FilterBar } from "@/features/explorer/components/filter-bar";
import { useExplorer } from "@/features/explorer/use-explorer";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { count } from "@/features/stats/format";
import { useActiveSet, useStats } from "@/lib/data/hooks";
import type { ExplorerFilter } from "@/lib/explorer/engine";

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
  head: () => ({ meta: [{ title: "Explorer · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): { filters?: ExplorerFilter[] } => {
    const filters = parseFilters(search.filters);
    return filters.length ? { filters } : {};
  },
  component: ExplorerPage,
});

function ExplorerPage() {
  const { patch, set } = useActiveSet();
  const stats = useStats();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const filters = search.filters ?? [];
  const url =
    patch === "latest" && stats?.status === "ready"
      ? `${import.meta.env.BASE_URL}data/stats/set${set}/explorer.bin.gz`
      : null;
  const { status, result } = useExplorer(url, filters);

  const setFilters = (next: ExplorerFilter[]) =>
    navigate({ search: next.length ? { filters: next } : {}, replace: true });

  return (
    <>
      <PageHeader
        title="Explorer"
        description="Filter ranked boards by champions, items, traits and level, then see what else does well with them."
      />
      {stats && <StatsMeta stats={stats} />}
      {status.state === "missing" ? (
        <NoStats subject={`Set ${set}`} />
      ) : status.state === "error" ? (
        <EmptyState>Couldn't load the board sample: {status.message}</EmptyState>
      ) : status.state === "loading" ? (
        <p className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading board sample…
        </p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <FilterBar filters={filters} onChange={setFilters} />
            <p className="text-xs text-muted-foreground">
              Results come from a sample of the {count(status.boards)} most recent boards, so they can differ slightly
              from the tier lists.
            </p>
          </div>
          {result && <ExplorerResults result={result} filters={filters} onChange={setFilters} />}
        </div>
      )}
    </>
  );
}

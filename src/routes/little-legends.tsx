import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NoStats } from "@/features/stats/components/no-stats";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { count, percent } from "@/features/stats/format";
import { useLittleLegends, useStats } from "@/lib/data/hooks";
import type { LittleLegend } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

type Kind = LittleLegend["kind"];

const KIND_LABEL: Record<Kind, string> = { legend: "Little Legends", chibi: "Chibis" };

/** Most legends are a sliver of players, so shares get a decimal place. */
const share = (play: number) => (play < 0.001 ? "<0.1%" : percent(play, 1));

const isKind = (value: unknown): value is Kind => value === "legend" || value === "chibi";

interface LittleLegendSearch {
  q?: string;
  kind?: Kind;
}

export const Route = createFileRoute("/little-legends")({
  head: () => ({ meta: [{ title: "Little Legends · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): LittleLegendSearch => ({
    q: stringParam(search.q),
    kind: isKind(search.kind) ? search.kind : undefined,
  }),
  component: LittleLegendsPage,
});

function LittleLegendsPage() {
  const stats = useStats();
  const legends = useLittleLegends();
  const search = Route.useSearch();
  const update = useUpdateSearch<LittleLegendSearch>();
  const filtered = (legends ?? []).filter(
    (legend) =>
      (matches(legend.name, search.q) || matches(legend.species, search.q)) &&
      (!search.kind || legend.kind === search.kind),
  );

  return (
    <>
      <PageHeader
        title="Little Legends"
        description="The Little Legends and Chibis players bring to ranked games, most popular first."
      />
      {stats?.status !== "ready" || !legends ? (
        <NoStats subject="Little Legends" />
      ) : (
        <>
          <StatsMeta stats={stats} />
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <SearchInput
              value={search.q ?? ""}
              onChange={(q) => update({ q: q || undefined })}
              placeholder="Search Little Legends"
            />
            <ToggleGroup
              type="single"
              variant="outline"
              value={search.kind ?? ""}
              onValueChange={(kind) => update({ kind: isKind(kind) ? kind : undefined })}
              aria-label="Filter by kind"
            >
              {Object.entries(KIND_LABEL).map(([kind, label]) => (
                <ToggleGroupItem key={kind} value={kind} className="px-3">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {filtered.length === 0 ? (
            <EmptyState>No Little Legends match these filters.</EmptyState>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {filtered.map((legend) => (
                <LegendCard key={legend.name} legend={legend} rank={legends.indexOf(legend) + 1} />
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}

function LegendCard({ legend, rank }: { legend: LittleLegend; rank: number }) {
  return (
    // content-visibility skips rendering off-screen cards; there can be hundreds of legends.
    <li className="overflow-hidden rounded-xl border bg-card shadow-xs [contain-intrinsic-size:auto_16rem] [content-visibility:auto]">
      <div className="relative aspect-square bg-muted">
        <img
          src={legend.icon}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="size-full object-cover select-none"
        />
        <span className="absolute top-2 left-2 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold tabular-nums shadow-xs">
          #{rank}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium" title={legend.name}>
          {legend.name}
        </p>
        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span title={`${count(legend.games)} players`}>{share(legend.play)} of players</span>
          <span>
            <AvgPlacement line={legend} /> avg
          </span>
        </p>
      </div>
    </li>
  );
}

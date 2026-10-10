import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChoiceFilter } from "@/components/game/choice-filter";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { NoStats } from "@/features/stats/components/no-stats";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { SortFilter } from "@/features/stats/components/stat-sort";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { type DatabaseSort, formatRate, orderEntries } from "@/features/stats/sort";
import { count, share } from "@/features/stats/format";
import { useLittleLegends, useStats } from "@/lib/data/hooks";
import type { LittleLegend } from "@/lib/data/schema";
import { matches, oneOf, stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

type Kind = LittleLegend["kind"];

const KIND_LABEL: Record<Kind, string> = { legend: "Little Legends", chibi: "Chibis" };

const KINDS = Object.keys(KIND_LABEL) as Kind[];

interface LittleLegendSearch {
  q?: string;
  kind?: Kind;
  sort?: DatabaseSort;
}

// The page is ordered by popularity already, so it has no separate play rate order.
const SORTS = ["avg", "top4"] as const satisfies DatabaseSort[];

export const Route = createFileRoute("/little-legends")({
  head: () => ({ meta: [{ title: "Little Legends · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): LittleLegendSearch => ({
    q: stringParam(search.q),
    kind: oneOf(KINDS, search.kind),
    sort: oneOf(SORTS, search.sort),
  }),
  component: LittleLegendsPage,
});

function LittleLegendsPage() {
  const stats = useStats();
  const legends = useLittleLegends();
  const search = Route.useSearch();
  const update = useUpdateSearch<LittleLegendSearch>();
  const ranked = useMemo(
    () => (legends && search.sort ? orderEntries(legends, (legend) => legend, search.sort) : (legends ?? [])),
    [legends, search.sort],
  );
  const filtered = ranked.filter(
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
      {stats && <StatsMeta stats={stats} />}
      {stats?.status !== "ready" || !legends ? (
        <NoStats subject="Little Legends" />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <SearchInput
              value={search.q ?? ""}
              onChange={(q) => update({ q: q || undefined })}
              placeholder="Search Little Legends"
            />
            <ChoiceFilter
              options={KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))}
              value={search.kind}
              onChange={(kind) => update({ kind })}
              label="Filter by kind"
              noneLabel="All kinds"
            />
            <SortFilter
              defaultLabel="By popularity"
              sorts={SORTS}
              value={search.sort}
              onChange={(sort) => update({ sort })}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState>No Little Legends match these filters.</EmptyState>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {filtered.map((legend) => (
                <LegendCard key={legend.name} legend={legend} rank={ranked.indexOf(legend) + 1} sort={search.sort} />
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}

function LegendCard({
  legend,
  rank,
  sort,
}: {
  legend: LittleLegend;
  rank: number;
  /** The page's order; sorted by top 4 rate, the card shows it in place of the play rate. */
  sort?: DatabaseSort;
}) {
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
          {sort === "top4" ? (
            <span>{formatRate(legend, "top4")} top 4</span>
          ) : (
            <span title={`${count(legend.games)} players`}>{share(legend.play)} of players</span>
          )}
          <span>
            <AvgPlacement line={legend} /> avg
          </span>
        </p>
      </div>
    </li>
  );
}

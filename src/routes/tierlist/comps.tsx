import { memo, useDeferredValue } from "react";
import { useProgressiveCount } from "@/lib/use-progressive-count";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChoiceFilter } from "@/components/game/choice-filter";
import { compsForSet } from "@/content";
import { type Comp, type Playstyle, PLAYSTYLES, type Tier } from "@/content/types";
import { AutoCompCard, CompCard } from "@/features/comps/components/comp-card";
import { CompFilterBar } from "@/features/comps/components/comp-filter-bar";
import { type CompFilters, parseCompFilters, passesCompFilters } from "@/features/comps/filters";
import { TierRows } from "@/features/comps/components/tier-rows";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useActiveSet, useAutoComps, useGameData, useTierStats } from "@/lib/data/hooks";
import { parsePatch, parseRank } from "@/features/stats/scope";
import { SortFilter } from "@/features/stats/components/stat-sort";
import { COMP_SORTS, type CompSort, rankByStat, SORT_LABELS } from "@/features/stats/sort";
import type { AutoComp, RankFloor } from "@/lib/data/schema";
import { computeTraits } from "@/lib/game/traits";
import { oneOf } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

type View = "stats" | "guides";

interface CompSearch extends CompFilters {
  playstyle?: Playstyle;
  view?: View;
  rank?: RankFloor;
  patch?: string;
  sort?: CompSort;
}

export const Route = createFileRoute("/tierlist/comps")({
  head: () => ({ meta: [{ title: "Comp Tier List · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): CompSearch => ({
    ...parseCompFilters(search),
    playstyle: oneOf(PLAYSTYLES, search.playstyle),
    view: oneOf(["stats", "guides"] as const, search.view),
    rank: parseRank(search.rank),
    patch: parsePatch(search.patch),
    sort: oneOf(COMP_SORTS, search.sort),
  }),
  component: CompTierListPage,
});

function NoMatches({ what }: { what: string }) {
  return <EmptyState>No {what} match these filters.</EmptyState>;
}

const GuideRows = memo(function GuideRows({
  comps,
  filters,
  playstyle,
}: {
  comps: Comp[];
  filters: CompFilters;
  playstyle?: Playstyle;
}) {
  const { championsByApi, traitsByApi, itemsByApi } = useGameData();
  const championName = (apiName: string) => championsByApi.get(apiName)?.name ?? "";
  const filtered = comps.filter(
    (comp) =>
      (!playstyle || comp.playstyle === playstyle) &&
      passesCompFilters(
        {
          name: comp.name,
          units: comp.board.map((unit) => unit.apiName),
          traits: computeTraits(
            comp.board.map((unit) => ({ apiName: unit.apiName, items: unit.items ?? [] })),
            championsByApi,
            traitsByApi,
            itemsByApi,
          )
            .filter((state) => state.activeIndex >= 0)
            .map((state) => state.trait.apiName),
        },
        filters,
        championName,
      ),
  );
  if (filtered.length === 0) return <NoMatches what="guides" />;
  const rows: Partial<Record<Tier, Comp[]>> = Object.groupBy(filtered, (comp) => comp.tier);
  return (
    <TierRows
      rows={rows}
      renderRow={(entries) => (
        <div className="grid gap-2 xl:grid-cols-2">
          {entries.map((comp) => (
            <CompCard key={comp.slug} comp={comp} />
          ))}
        </div>
      )}
    />
  );
});

const StatRows = memo(function StatRows({
  comps,
  filters,
  rank,
  patch,
  sort,
}: {
  comps: AutoComp[];
  filters: CompFilters;
  rank?: RankFloor;
  patch?: string;
  sort?: CompSort;
}) {
  const { championsByApi } = useGameData();
  const championName = (apiName: string) => championsByApi.get(apiName)?.name ?? "";
  const filtered = comps.filter((comp) =>
    passesCompFilters(
      {
        name: comp.name,
        units: comp.units.map((unit) => unit.apiName),
        traits: comp.traits.map((entry) => entry.trait),
      },
      filters,
      championName,
    ),
  );
  const shown = useProgressiveCount(filtered.length);
  if (filtered.length === 0) return <NoMatches what="comps" />;
  if (sort) {
    return (
      <section aria-label={SORT_LABELS[sort]} className="rounded-xl border bg-card/60 p-3">
        <div className="grid gap-2 xl:grid-cols-2">
          {rankByStat(filtered, (comp) => comp, sort)
            .slice(0, shown)
            .map((comp) => (
              <AutoCompCard key={comp.id} comp={comp} rank={rank} patch={patch} sort={sort} />
            ))}
        </div>
      </section>
    );
  }
  // Comps come best first, so the first batches fill the top tiers.
  const rows: Partial<Record<Tier, AutoComp[]>> = Object.groupBy(filtered.slice(0, shown), (comp) => comp.tier ?? "C");
  return (
    <TierRows
      rows={rows}
      renderRow={(entries) => (
        <div className="grid gap-2 xl:grid-cols-2">
          {entries.map((comp) => (
            <AutoCompCard key={comp.id} comp={comp} rank={rank} patch={patch} />
          ))}
        </div>
      )}
    />
  );
});

function CompTierListPage() {
  const { set } = useActiveSet();
  const search = Route.useSearch();
  // The comp lists render with the previous filters while a keystroke's update is pending, so typing stays responsive.
  const filters = useDeferredValue(search);
  const stats = useTierStats(search.rank, undefined, search.patch);
  const detected = useAutoComps(search.rank, search.patch) ?? [];
  const guides = compsForSet(set);
  const view: View = search.view ?? (detected.length > 0 ? "stats" : "guides");

  const update = useUpdateSearch<CompSearch>();

  return (
    <>
      <PageHeader
        title="Comp Tier List"
        description={`Comps for Set ${set}: detected from ranked games, and hand-written guides.`}
      />
      <Tabs value={view} onValueChange={(value) => update({ view: value as View })}>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="stats">From stats ({detected.length})</TabsTrigger>
            <TabsTrigger value="guides">Guides ({guides.length})</TabsTrigger>
          </TabsList>
          <CompFilterBar value={search} onChange={update}>
            {view === "stats" && detected.length > 0 && (
              <SortFilter
                defaultLabel="By tier"
                sorts={COMP_SORTS}
                value={search.sort}
                onChange={(sort) => update({ sort })}
              />
            )}
            {view === "guides" && (
              <ChoiceFilter
                options={PLAYSTYLES.map((playstyle) => ({ value: playstyle, label: playstyle }))}
                value={search.playstyle}
                onChange={(playstyle) => update({ playstyle })}
                label="Filter by playstyle"
                noneLabel="All playstyles"
              />
            )}
          </CompFilterBar>
        </div>
        <TabsContent value="stats">
          {stats && (
            <StatsMeta
              stats={stats}
              // Other patches' comps exist at the default floor only, so a rank and a patch don't combine.
              onRankChange={(rank) => update({ rank, patch: undefined })}
              patch={{ onChange: (patch) => update({ patch, rank: undefined }) }}
            />
          )}
          {!stats ? (
            <NoStats />
          ) : detected.length === 0 ? (
            <EmptyState>No comps have enough games to be detected for Set {set} yet.</EmptyState>
          ) : (
            <StatRows comps={detected} filters={filters} rank={search.rank} patch={search.patch} sort={filters.sort} />
          )}
        </TabsContent>
        <TabsContent value="guides">
          {guides.length === 0 ? (
            <EmptyState>No comp guides have been written for Set {set} yet.</EmptyState>
          ) : (
            <GuideRows comps={guides} filters={filters} playstyle={search.playstyle} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { compsForSet } from "@/content";
import { type Comp, type Playstyle, PLAYSTYLES, type Tier } from "@/content/types";
import { AutoCompCard, CompCard } from "@/features/comps/components/comp-card";
import { TierRows } from "@/features/comps/components/tier-rows";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useActiveSet, useAutoComps, useGameData, useStats } from "@/lib/data/hooks";
import type { AutoComp } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";

type View = "stats" | "guides";

interface CompSearch {
  q?: string;
  playstyle?: Playstyle;
  view?: View;
}

const isPlaystyle = (value: unknown): value is Playstyle => PLAYSTYLES.includes(value as Playstyle);

export const Route = createFileRoute("/tierlist/comps")({
  head: () => ({ meta: [{ title: "Comp Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): CompSearch => ({
    q: stringParam(search.q),
    playstyle: isPlaystyle(search.playstyle) ? search.playstyle : undefined,
    view: search.view === "stats" || search.view === "guides" ? search.view : undefined,
  }),
  component: CompTierListPage,
});

function GuideRows({ comps, query, playstyle }: { comps: Comp[]; query?: string; playstyle?: Playstyle }) {
  const { championsByApi } = useGameData();
  const filtered = comps.filter(
    (comp) =>
      (!playstyle || comp.playstyle === playstyle) &&
      (matches(comp.name, query) ||
        comp.board.some((unit) => matches(championsByApi.get(unit.apiName)?.name ?? "", query))),
  );
  if (filtered.length === 0) return <EmptyState>No guides match these filters.</EmptyState>;
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
}

function StatRows({ comps, query }: { comps: AutoComp[]; query?: string }) {
  const { championsByApi } = useGameData();
  const filtered = comps.filter(
    (comp) =>
      matches(comp.name, query) ||
      comp.units.some((unit) => matches(championsByApi.get(unit.apiName)?.name ?? "", query)),
  );
  if (filtered.length === 0) return <EmptyState>No comps match "{query}".</EmptyState>;
  const rows: Partial<Record<Tier, AutoComp[]>> = Object.groupBy(filtered, (comp) => comp.tier ?? "C");
  return (
    <TierRows
      rows={rows}
      renderRow={(entries) => (
        <div className="grid gap-2 xl:grid-cols-2">
          {entries.map((comp) => (
            <AutoCompCard key={comp.id} comp={comp} />
          ))}
        </div>
      )}
    />
  );
}

function CompTierListPage() {
  const { set } = useActiveSet();
  const stats = useStats();
  const detected = useAutoComps() ?? [];
  const guides = compsForSet(set);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const view: View = search.view ?? (detected.length > 0 ? "stats" : "guides");

  const update = (patch: Partial<CompSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

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
          <SearchInput
            value={search.q ?? ""}
            onChange={(q) => update({ q: q || undefined })}
            placeholder="Search comps or champions"
          />
          {view === "guides" && (
            <ToggleGroup
              type="single"
              variant="outline"
              value={search.playstyle ?? ""}
              onValueChange={(value) => update({ playstyle: isPlaystyle(value) ? value : undefined })}
              className="flex-wrap"
              aria-label="Filter by playstyle"
            >
              {PLAYSTYLES.map((playstyle) => (
                <ToggleGroupItem key={playstyle} value={playstyle} className="px-3">
                  {playstyle}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
        <TabsContent value="stats">
          {stats && <StatsMeta stats={stats} />}
          {detected.length === 0 ? (
            <EmptyState>No comps have enough games to be detected for Set {set} yet.</EmptyState>
          ) : (
            <StatRows comps={detected} query={search.q} />
          )}
        </TabsContent>
        <TabsContent value="guides">
          {guides.length === 0 ? (
            <EmptyState>No comp guides have been written for Set {set} yet.</EmptyState>
          ) : (
            <GuideRows comps={guides} query={search.q} playstyle={search.playstyle} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

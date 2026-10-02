import { createFileRoute } from "@tanstack/react-router";
import { ChampionFilter, TraitFilter } from "@/components/game/filters";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { compsForSet } from "@/content";
import { type Comp, type Playstyle, PLAYSTYLES, type Tier } from "@/content/types";
import { AutoCompCard, CompCard } from "@/features/comps/components/comp-card";
import { TierRows } from "@/features/comps/components/tier-rows";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useRankChoice } from "@/features/stats/use-rank-choice";
import { useActiveSet, useAutoComps, useGameData, useTierStats } from "@/lib/data/hooks";
import { isRankFloor } from "@/lib/data/constants";
import type { AutoComp, RankFloor } from "@/lib/data/schema";
import { computeTraits } from "@/lib/game/traits";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, stringParam } from "@/lib/search";

type View = "stats" | "guides";

interface CompSearch {
  q?: string;
  /** Comps that field this champion… */
  champion?: string;
  /** …as one of their carries. */
  carry?: boolean;
  /** Comps that run this trait (at any breakpoint). */
  trait?: string;
  playstyle?: Playstyle;
  view?: View;
  rank?: RankFloor;
}

type CompFilters = Pick<CompSearch, "q" | "champion" | "carry" | "trait">;

const hasFilters = ({ q, champion, trait }: CompFilters) => Boolean(q || champion || trait);

const isPlaystyle = (value: unknown): value is Playstyle => PLAYSTYLES.includes(value as Playstyle);

export const Route = createFileRoute("/tierlist/comps")({
  head: () => ({ meta: [{ title: "Comp Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): CompSearch => ({
    q: stringParam(search.q),
    champion: stringParam(search.champion),
    carry: search.carry === true || search.carry === "true" ? true : undefined,
    trait: stringParam(search.trait),
    playstyle: isPlaystyle(search.playstyle) ? search.playstyle : undefined,
    view: search.view === "stats" || search.view === "guides" ? search.view : undefined,
    rank: isRankFloor(search.rank) ? search.rank : undefined,
  }),
  component: CompTierListPage,
});

/** Whether a comp, given as its units, carries and traits, passes the filters. */
function passes(
  name: string,
  units: { apiName: string; carry: boolean }[],
  traits: string[],
  { q, champion, carry, trait }: CompFilters,
  championName: (apiName: string) => string,
) {
  const textMatch = matches(name, q) || units.some((unit) => matches(championName(unit.apiName), q));
  const championMatch = !champion || units.some((unit) => unit.apiName === champion && (!carry || unit.carry));
  return textMatch && championMatch && (!trait || traits.includes(trait));
}

function GuideRows({ comps, filters, playstyle }: { comps: Comp[]; filters: CompFilters; playstyle?: Playstyle }) {
  const { championsByApi, traitsByApi, itemsByApi } = useGameData();
  const championName = (apiName: string) => championsByApi.get(apiName)?.name ?? "";
  const filtered = comps.filter(
    (comp) =>
      (!playstyle || comp.playstyle === playstyle) &&
      passes(
        comp.name,
        comp.board.map((unit) => ({ apiName: unit.apiName, carry: Boolean(unit.carry) })),
        computeTraits(
          comp.board.map((unit) => ({ apiName: unit.apiName, items: unit.items ?? [] })),
          championsByApi,
          traitsByApi,
          itemsByApi,
        )
          .filter((state) => state.activeIndex >= 0)
          .map((state) => state.trait.apiName),
        filters,
        championName,
      ),
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

function StatRows({ comps, filters, rank }: { comps: AutoComp[]; filters: CompFilters; rank?: RankFloor }) {
  const { championsByApi } = useGameData();
  const championName = (apiName: string) => championsByApi.get(apiName)?.name ?? "";
  const filtered = comps.filter((comp) =>
    passes(
      comp.name,
      comp.units.map((unit) => ({ apiName: unit.apiName, carry: comp.carries.includes(unit.apiName) })),
      comp.traits.map((entry) => entry.trait),
      filters,
      championName,
    ),
  );
  if (filtered.length === 0) return <EmptyState>No comps match these filters.</EmptyState>;
  const rows: Partial<Record<Tier, AutoComp[]>> = Object.groupBy(filtered, (comp) => comp.tier ?? "C");
  return (
    <TierRows
      rows={rows}
      renderRow={(entries) => (
        <div className="grid gap-2 xl:grid-cols-2">
          {entries.map((comp) => (
            <AutoCompCard key={comp.id} comp={comp} rank={rank} />
          ))}
        </div>
      )}
    />
  );
}

function CompTierListPage() {
  const { set } = useActiveSet();
  const search = Route.useSearch();
  const stats = useTierStats(search.rank);
  const detected = useAutoComps(search.rank) ?? [];
  const guides = compsForSet(set);
  const view: View = search.view ?? (detected.length > 0 ? "stats" : "guides");

  const update = useUpdateSearch<CompSearch>();
  const rankChoice = useRankChoice((rank) => update({ rank }));

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
            placeholder="Search comps"
          />
          <ChampionFilter
            value={search.champion}
            onChange={(champion) => update({ champion, carry: champion ? search.carry : undefined })}
          />
          {search.champion && (
            <Toggle
              variant="outline"
              pressed={Boolean(search.carry)}
              onPressedChange={(carry) => update({ carry: carry || undefined })}
              title="Only comps where this champion is a carry"
            >
              As carry
            </Toggle>
          )}
          <TraitFilter value={search.trait} onChange={(trait) => update({ trait })} />
          {hasFilters(search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ q: undefined, champion: undefined, carry: undefined, trait: undefined })}
            >
              Clear
            </Button>
          )}
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
          {stats && <StatsMeta stats={stats} rank={rankChoice} />}
          {!stats ? (
            <NoStats />
          ) : detected.length === 0 ? (
            <EmptyState>No comps have enough games to be detected for Set {set} yet.</EmptyState>
          ) : (
            <StatRows comps={detected} filters={search} rank={search.rank} />
          )}
        </TabsContent>
        <TabsContent value="guides">
          {guides.length === 0 ? (
            <EmptyState>No comp guides have been written for Set {set} yet.</EmptyState>
          ) : (
            <GuideRows comps={guides} filters={search} playstyle={search.playstyle} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

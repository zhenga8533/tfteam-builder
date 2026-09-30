import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { compsForSet } from "@/content";
import { type Comp, type Playstyle, PLAYSTYLES, type Tier } from "@/content/types";
import { CompCard } from "@/features/comps/components/comp-card";
import { TierRows } from "@/features/comps/components/tier-rows";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { matches, stringParam } from "@/lib/search";

interface CompSearch {
  q?: string;
  playstyle?: Playstyle;
}

const isPlaystyle = (value: unknown): value is Playstyle => PLAYSTYLES.includes(value as Playstyle);

export const Route = createFileRoute("/tierlist/comps")({
  head: () => ({ meta: [{ title: "Comp Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): CompSearch => ({
    q: stringParam(search.q),
    playstyle: isPlaystyle(search.playstyle) ? search.playstyle : undefined,
  }),
  component: CompTierListPage,
});

function CompTierListPage() {
  const { set } = useActiveSet();
  const { championsByApi } = useGameData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const comps = compsForSet(set);

  const update = (patch: Partial<CompSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  const filtered = comps.filter(
    (comp) =>
      (!search.playstyle || comp.playstyle === search.playstyle) &&
      (matches(comp.name, search.q) ||
        comp.board.some((unit) => matches(championsByApi.get(unit.apiName)?.name ?? "", search.q))),
  );
  const rows: Partial<Record<Tier, Comp[]>> = Object.groupBy(filtered, (comp) => comp.tier);
  const updatedAt = comps
    .map((comp) => comp.updatedAt)
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        title="Comp Tier List"
        description={
          updatedAt ? `The strongest team comps for Set ${set}. Last updated ${updatedAt}.` : `Set ${set} comps.`
        }
      />
      {comps.length === 0 ? (
        <EmptyState>No comps have been written for Set {set} yet.</EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <SearchInput
              value={search.q ?? ""}
              onChange={(q) => update({ q: q || undefined })}
              placeholder="Search comps or champions"
            />
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
          </div>
          {filtered.length === 0 ? (
            <EmptyState>No comps match these filters.</EmptyState>
          ) : (
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
          )}
        </>
      )}
    </>
  );
}

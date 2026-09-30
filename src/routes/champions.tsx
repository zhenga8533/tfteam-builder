import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChampionCard } from "@/components/game/cards";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { matches, numberParam, stringParam } from "@/lib/search";
import { cn } from "@/lib/utils";

interface ChampionSearch {
  q?: string;
  cost?: number;
  trait?: string;
}

export const Route = createFileRoute("/champions")({
  head: () => ({ meta: [{ title: "Champions · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): ChampionSearch => ({
    q: stringParam(search.q),
    cost: numberParam(search.cost),
    trait: stringParam(search.trait),
  }),
  component: ChampionsPage,
});

const ALL = "all";

function ChampionTile({ champion, onSelect }: { champion: Champion; onSelect: () => void }) {
  const { traitsByApi } = useGameData();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ChampionIcon champion={champion} className="size-12" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium">{champion.name}</p>
        <div className="flex gap-1">
          {champion.traits.map((apiName) => {
            const trait = traitsByApi.get(apiName);
            return trait ? <TraitIcon key={apiName} trait={trait} className="size-5" /> : null;
          })}
        </div>
      </div>
    </button>
  );
}

function ChampionsPage() {
  const { champions, traits } = useGameData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [selected, setSelected] = useState<Champion | null>(null);

  const update = (patch: Partial<ChampionSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  const byCost = useMemo(() => {
    const filtered = champions.filter(
      (champion) =>
        matches(champion.name, search.q) &&
        (search.cost === undefined || champion.cost === search.cost) &&
        (!search.trait || champion.traits.includes(search.trait)),
    );
    return COSTS.map((cost) => ({ cost, champions: filtered.filter((champion) => champion.cost === cost) })).filter(
      (group) => group.champions.length > 0,
    );
  }, [champions, search]);

  return (
    <>
      <PageHeader title="Champions" description="Every unit in the shop with its traits, ability and base stats." />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search.q ?? ""}
          onChange={(q) => update({ q: q || undefined })}
          placeholder="Search champions"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          value={search.cost ? String(search.cost) : ""}
          onValueChange={(value) => update({ cost: value ? Number(value) : undefined })}
          aria-label="Filter by cost"
        >
          {COSTS.map((cost) => (
            <ToggleGroupItem key={cost} value={String(cost)} className={cn("w-9 font-semibold", COST_TEXT[cost])}>
              {cost}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          value={search.trait ?? ALL}
          onValueChange={(value) => update({ trait: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by trait">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All traits</SelectItem>
            {traits.map((trait) => (
              <SelectItem key={trait.apiName} value={trait.apiName}>
                {trait.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {byCost.length === 0 ? (
        <EmptyState>No champions match these filters.</EmptyState>
      ) : (
        <div className="space-y-8">
          {byCost.map((group) => (
            <section key={group.cost} aria-labelledby={`cost-${group.cost}`}>
              <h2
                id={`cost-${group.cost}`}
                className={cn("mb-3 font-display text-lg font-semibold", COST_TEXT[group.cost])}
              >
                {group.cost} Cost
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
                {group.champions.map((champion) => (
                  <ChampionTile key={champion.apiName} champion={champion} onSelect={() => setSelected(champion)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle className="sr-only">{selected?.name}</DialogTitle>
          {selected && (
            <>
              <img
                src={selected.splash}
                alt=""
                className="-mx-6 -mt-6 aspect-[2/1] w-[calc(100%+3rem)] max-w-none rounded-t-lg object-cover object-top"
              />
              <ChampionCard champion={selected} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { ChampionCard } from "@/components/game/cards";
import { ChampionFilterBar } from "@/components/game/filters";
import { type ChampionFilters, matchesChampionFilters, parseChampionFilters } from "@/components/game/filter-params";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChampionForms } from "@/features/stats/components/champion-forms";
import { share } from "@/features/stats/format";
import { AvgPlacement, StatSummary } from "@/features/stats/components/stat-summary";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { useUpdateSearch } from "@/lib/use-update-search";
import { cn } from "@/lib/utils";

interface ChampionSearch extends ChampionFilters {
  sort?: "avg" | "play";
}

export const Route = createFileRoute("/champions")({
  head: () => ({ meta: [{ title: "Champions · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): ChampionSearch => ({
    ...parseChampionFilters(search),
    sort: search.sort === "avg" || search.sort === "play" ? search.sort : undefined,
  }),
  component: ChampionsPage,
});

function ChampionTile({ champion, onSelect }: { champion: Champion; onSelect: () => void }) {
  const { traitsByApi } = useGameData();
  const line = useStats()?.units[champion.apiName];
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
      {line && (
        <span className="flex flex-col items-end self-start">
          <AvgPlacement line={line} className="text-sm" />
          <span
            className="text-[11px] text-muted-foreground tabular-nums"
            title="Share of games fielding this champion"
          >
            {share(line.play)} played
          </span>
        </span>
      )}
    </button>
  );
}

/** Below this width the splash would be visibly upscaled as a banner; older sets only ship small splashes. */
const SHARP_SPLASH_WIDTH = 512;

/**
 * The champion's splash across the top of the dialog. A small splash (older sets) is shown at its own size, over a
 * blurred copy that fills the banner, rather than stretched.
 */
function SplashBanner({ champion }: { champion: Champion }) {
  const [width, setWidth] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  if (!champion.splash || failed) return null;
  const small = width !== null && width < SHARP_SPLASH_WIDTH;
  return (
    <div className="relative -mx-6 -mt-6 flex aspect-[2/1] w-[calc(100%+3rem)] max-w-none items-center justify-center overflow-hidden rounded-t-lg bg-muted">
      {small && (
        <img
          src={champion.splash}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-xl"
        />
      )}
      <img
        src={champion.splash}
        alt=""
        onLoad={(event) => setWidth(event.currentTarget.naturalWidth)}
        onError={() => setFailed(true)}
        className={cn(
          "transition-opacity",
          width === null && "opacity-0",
          small ? "relative max-h-[85%] max-w-[85%] rounded-md shadow-lg" : "size-full object-cover object-top",
        )}
      />
    </div>
  );
}

function ChampionsPage() {
  const { champions } = useGameData();
  const search = Route.useSearch();
  const [selected, setSelected] = useState<Champion | null>(null);

  const update = useUpdateSearch<ChampionSearch>();

  const stats = useStats();
  const groups = useMemo(() => {
    const filtered = champions.filter((champion) => matchesChampionFilters(champion, search));
    if (search.sort === "avg" && stats?.status === "ready") {
      const score = (champion: Champion) => stats.units[champion.apiName]?.score ?? Infinity;
      return [
        { title: "By average placement", cost: undefined, champions: filtered.sort((a, b) => score(a) - score(b)) },
      ];
    }
    if (search.sort === "play" && stats?.status === "ready") {
      const play = (champion: Champion) => stats.units[champion.apiName]?.play ?? 0;
      return [{ title: "By play rate", cost: undefined, champions: filtered.sort((a, b) => play(b) - play(a)) }];
    }
    return COSTS.map((cost) => ({
      title: `${cost} Cost`,
      cost,
      champions: filtered.filter((champion) => champion.cost === cost),
    })).filter((group) => group.champions.length > 0);
  }, [champions, search, stats]);

  return (
    <>
      <PageHeader title="Champions" description="Every unit in the shop with its traits, ability and base stats." />
      {stats && <StatsMeta stats={stats} />}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ChampionFilterBar value={search} onChange={update} />
        {stats?.status === "ready" && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={search.sort ?? "cost"}
            onValueChange={(value) =>
              value && update({ sort: value === "avg" || value === "play" ? value : undefined })
            }
            aria-label="Sort"
          >
            <ToggleGroupItem value="cost" className="px-3">
              By cost
            </ToggleGroupItem>
            <ToggleGroupItem value="avg" className="px-3">
              By placement
            </ToggleGroupItem>
            <ToggleGroupItem value="play" className="px-3">
              By play rate
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState>No champions match these filters.</EmptyState>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h2 className={cn("mb-3 font-display text-lg font-semibold", group.cost && COST_TEXT[group.cost])}>
                {group.title}
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
              <SplashBanner key={selected.apiName} champion={selected} />
              <ChampionCard champion={selected} />
              <ChampionForms champion={selected} title="Other forms" className="border-t pt-3" />
              {stats?.units[selected.apiName] && (
                <StatSummary line={stats.units[selected.apiName]!} play="of games" className="border-t pt-3" />
              )}
              <Button asChild variant="secondary" className="w-full">
                <Link to="/champions/$apiName" params={{ apiName: selected.apiName }}>
                  Builds, partners and full stats <ArrowRight />
                </Link>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

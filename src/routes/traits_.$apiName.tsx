import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TraitCard } from "@/components/game/cards";
import { TraitIcon } from "@/components/game/icons";
import { ChampionLink, ItemLink } from "@/components/game/links";
import { COST_TEXT } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { Section } from "@/components/layout/section";
import { AutoCompList } from "@/features/comps/components/auto-comp-list";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { PlacementChart } from "@/features/stats/components/placement-chart";
import { PatchHistoryChart, StatTrend } from "@/features/stats/components/patch-trend";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { StatTable } from "@/features/stats/components/stat-table";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useGameData, useStats, useTraitStats } from "@/lib/data/hooks";
import type { Trait, TraitStats } from "@/lib/data/schema";
import { traitKey, traitStyle } from "@/lib/game/traits";

export const Route = createFileRoute("/traits_/$apiName")({
  head: () => ({ meta: [{ title: "Trait Stats · TFTeam" }] }),
  component: TraitPage,
});

function Breakpoints({ trait }: { trait: Trait }) {
  const stats = useStats();
  const lines = stats?.traits.filter((line) => line.trait === trait.apiName) ?? [];
  return (
    <StatTable
      showDelta={false}
      keepOrder
      playBaseline="all games"
      empty="Not enough games at any breakpoint yet."
      rows={lines
        .toSorted((a, b) => a.minUnits - b.minUnits)
        .flatMap((line) => {
          const breakpoint = trait.breakpoints.find((entry) => entry.minUnits === line.minUnits);
          if (!breakpoint) return [];
          return [
            {
              key: String(line.minUnits),
              label: (
                <span className="flex items-center gap-2">
                  <TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-6" />
                  {line.minUnits} {trait.name}
                </span>
              ),
              line,
            },
          ];
        })}
    />
  );
}

function BestUnits({ stats }: { stats: TraitStats }) {
  const { championsByApi } = useGameData();
  return (
    <StatTable
      deltaBaseline="the average placement of games running this trait"
      playBaseline="games running this trait"
      search="Search champions"
      rows={stats.units.flatMap((entry) => {
        const champion = championsByApi.get(entry.unit);
        return champion
          ? [{ key: entry.unit, name: champion.name, label: <ChampionLink champion={champion} />, line: entry }]
          : [];
      })}
    />
  );
}

function Members({ trait }: { trait: Trait }) {
  const { champions, items } = useGameData();
  const members = champions.filter((champion) => champion.traits.includes(trait.apiName));
  const emblem = items.find((item) => item.trait === trait.apiName);
  if (members.length === 0 && !emblem) return null;
  return (
    <Section title="Champions">
      <ul className="space-y-1.5">
        {members.map((champion) => (
          <li key={champion.apiName} className="flex items-center justify-between gap-2 text-sm">
            <ChampionLink champion={champion} />
            <span className={COST_TEXT[champion.cost]}>{champion.cost}</span>
          </li>
        ))}
        {emblem && (
          <li className="border-t pt-2 text-sm">
            <ItemLink item={emblem} />
          </li>
        )}
      </ul>
    </Section>
  );
}

function TraitPage() {
  const { apiName } = Route.useParams();
  const { traitsByApi } = useGameData();
  const setStats = useStats();
  const stats = useTraitStats(apiName);
  const trait = traitsByApi.get(apiName);

  if (!trait) return <EmptyState>That trait isn't in the selected set.</EmptyState>;
  const top = trait.breakpoints.at(-1);
  const busiest = setStats?.traits.filter((line) => line.trait === trait.apiName).sort((a, b) => b.games - a.games)[0];
  const bestTier = setStats?.traits
    .filter((line) => line.trait === trait.apiName && line.tier)
    .sort((a, b) => a.score - b.score)[0]?.tier;

  return (
    <div className="space-y-6">
      <Link to="/traits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Traits
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <TraitIcon trait={trait} style={top ? traitStyle(top.style) : undefined} className="size-16" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{trait.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {trait.breakpoints.map((breakpoint) => breakpoint.minUnits).join(" / ")}
          </p>
          {busiest && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">At {busiest.minUnits}:</span>
              <StatSummary line={busiest} play="of games" />
              <StatTrend trend={setStats?.trend} kind="traits" entry={traitKey(trait.apiName, busiest.minUnits)} />
            </span>
          )}
        </div>
        {bestTier && <TierBadge tier={bestTier} className="size-14 text-3xl" />}
      </header>
      {setStats && <StatsMeta stats={setStats} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {setStats && (
            <Section title="Breakpoints">
              <Breakpoints trait={trait} />
            </Section>
          )}
          {stats ? (
            <>
              <Section title="Best units">
                <BestUnits stats={stats} />
              </Section>
              {stats.comps.length > 0 && (
                <Section title="Comps">
                  <AutoCompList ids={stats.comps} />
                </Section>
              )}
            </>
          ) : (
            <NoStats subject={trait.name} />
          )}
        </div>
        <aside className="space-y-4">
          <Section title="Effect">
            <TraitCard trait={trait} />
          </Section>
          <Members trait={trait} />
          {busiest?.places && (
            <Section title="Placements">
              <p className="mb-2 text-xs text-muted-foreground">
                At {busiest.minUnits} {trait.name}, its most played breakpoint
              </p>
              <PlacementChart places={busiest.places} />
            </Section>
          )}
          {busiest && (
            <Section title="Patch history">
              <p className="mb-2 text-xs text-muted-foreground">
                At {busiest.minUnits} {trait.name}, its most played breakpoint
              </p>
              <PatchHistoryChart kind="traits" entry={traitKey(trait.apiName, busiest.minUnits)} />
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

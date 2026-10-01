import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ChampionCard, TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon, TraitIcon } from "@/components/game/icons";
import { COST_TEXT } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { ChampionForms } from "@/features/stats/components/champion-forms";
import { ItemBuilds } from "@/features/stats/components/item-builds";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { StatTable } from "@/features/stats/components/stat-table";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useChampionStats, useGameData, useStats } from "@/lib/data/hooks";
import type { Champion, ChampionStats } from "@/lib/data/schema";
import { traitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/champions_/$apiName")({
  head: () => ({ meta: [{ title: "Champion Stats · TFTeam Builder" }] }),
  component: ChampionPage,
});

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="font-display">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function Partners({ stats }: { stats: ChampionStats }) {
  const { championsByApi } = useGameData();
  return (
    <StatTable
      rows={stats.partners.flatMap((partner) => {
        const champion = championsByApi.get(partner.unit);
        if (!champion) return [];
        return [
          {
            key: partner.unit,
            label: (
              <Link
                to="/champions/$apiName"
                params={{ apiName: champion.apiName }}
                className="flex items-center gap-2 hover:underline"
              >
                <ChampionIcon champion={champion} className="size-7" />
                <span className="truncate">{champion.name}</span>
              </Link>
            ),
            line: partner,
          },
        ];
      })}
    />
  );
}

function Traits({ stats }: { stats: ChampionStats }) {
  const { traitsByApi } = useGameData();
  return (
    <StatTable
      rows={stats.traits.flatMap((entry) => {
        const trait = traitsByApi.get(entry.trait);
        const breakpoint = trait?.breakpoints.find((b) => b.minUnits === entry.minUnits);
        if (!trait || !breakpoint) return [];
        return [
          {
            key: `${entry.trait}:${entry.minUnits}`,
            label: (
              <GameHoverCard content={<TraitCard trait={trait} count={entry.minUnits} />}>
                <span tabIndex={0} className="flex items-center gap-2 outline-none">
                  <TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-6" />
                  <span className="truncate">
                    {entry.minUnits} {trait.name}
                  </span>
                </span>
              </GameHoverCard>
            ),
            line: entry,
          },
        ];
      })}
    />
  );
}

function StarLevels({ stats }: { stats: ChampionStats }) {
  return (
    <StatTable
      showDelta={false}
      rows={Object.entries(stats.stars).map(([star, line]) => ({
        key: star,
        label: <span className="text-trait-gold">{"★".repeat(Number(star))}</span>,
        line,
      }))}
    />
  );
}

function ChampionHeader({ champion }: { champion: Champion }) {
  const { traitsByApi } = useGameData();
  const line = useStats()?.units[champion.apiName];
  return (
    <header className="flex flex-wrap items-center gap-4">
      <ChampionIcon champion={champion} className="size-16" />
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">{champion.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={COST_TEXT[champion.cost]}>{champion.cost} cost</span>
          {champion.traits.map((apiName) => {
            const trait = traitsByApi.get(apiName);
            return trait ? (
              <span key={apiName} className="flex items-center gap-1 text-muted-foreground">
                <TraitIcon trait={trait} className="size-4" />
                {trait.name}
              </span>
            ) : null;
          })}
        </p>
        {line && <StatSummary line={line} />}
      </div>
      {line?.tier && <TierBadge tier={line.tier} className="size-14 text-3xl" />}
    </header>
  );
}

function ChampionPage() {
  const { apiName } = Route.useParams();
  const { championsByApi } = useGameData();
  const setStats = useStats();
  const stats = useChampionStats(apiName);
  const champion = championsByApi.get(apiName);

  if (!champion) return <EmptyState>That champion isn't in the selected set.</EmptyState>;

  return (
    <div className="space-y-6">
      <Link
        to="/champions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Champions
      </Link>
      <ChampionHeader champion={champion} />
      {setStats && <StatsMeta stats={setStats} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {stats ? (
            <>
              <Section title="Item builds">
                <ItemBuilds stats={stats} />
              </Section>
              <div className="grid gap-6 xl:grid-cols-2">
                <Section title="Best partners">
                  <Partners stats={stats} />
                </Section>
                <Section title="Traits">
                  <Traits stats={stats} />
                </Section>
              </div>
            </>
          ) : (
            <EmptyState>No match stats for {champion.name} yet.</EmptyState>
          )}
        </div>
        <aside className="space-y-4">
          <Section title="Ability & stats">
            <ChampionCard champion={champion} />
          </Section>
          {stats && (
            <Section title="Star levels">
              <StarLevels stats={stats} />
            </Section>
          )}
          {champion.forms.length > 0 && (
            <Section title="Forms">
              <ChampionForms champion={champion} />
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

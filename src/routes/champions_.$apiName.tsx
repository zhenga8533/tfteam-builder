import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChampionCard } from "@/components/game/cards";
import { ChampionLink, TraitLink } from "@/components/game/links";
import { ChampionIcon } from "@/components/game/icons";
import { COST_TEXT } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { Section } from "@/components/layout/section";
import { AutoCompList } from "@/features/comps/components/auto-comp-list";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { ChampionForms } from "@/features/stats/components/champion-forms";
import { otherForms } from "@/lib/game/forms";
import { ItemBuilds } from "@/features/stats/components/item-builds";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { StatTable } from "@/features/stats/components/stat-table";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useChampionStats, useGameData, useStats } from "@/lib/data/hooks";
import type { Champion, ChampionStats } from "@/lib/data/schema";
import { traitStyle } from "@/lib/game/traits";

export const Route = createFileRoute("/champions_/$apiName")({
  head: () => ({ meta: [{ title: "Champion Stats · TFTeam Builder" }] }),
  component: ChampionPage,
});

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
            label: <ChampionLink champion={champion} />,
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
              <TraitLink
                trait={trait}
                style={traitStyle(breakpoint.style)}
                count={entry.minUnits}
                label={`${entry.minUnits} ${trait.name}`}
              />
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
          {champion.role && <span className="text-muted-foreground">{champion.role}</span>}
          {champion.traits.map((apiName) => {
            const trait = traitsByApi.get(apiName);
            return trait ? (
              <TraitLink key={apiName} trait={trait} className="gap-1 text-muted-foreground" iconClassName="size-4" />
            ) : null;
          })}
        </p>
        {line && <StatSummary line={line} />}
      </div>
      {line?.tier && <TierBadge tier={line.tier} className="size-14 text-3xl" />}
    </header>
  );
}

function FormsSection({ champion }: { champion: Champion }) {
  const { champions } = useGameData();
  if (otherForms(champion, champions).length === 0) return null;
  return (
    <Section title="Other forms">
      <ChampionForms champion={champion} />
    </Section>
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
              {stats.comps.length > 0 && (
                <Section title="Comps">
                  <AutoCompList ids={stats.comps} />
                </Section>
              )}
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
          <FormsSection champion={champion} />
        </aside>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MissingEntry } from "@/components/game/missing-entry";
import { ChampionCard } from "@/components/game/cards";
import { ChampionLink, TraitLink } from "@/components/game/links";
import { ChampionIcon } from "@/components/game/icons";
import { COST_TEXT } from "@/components/game/styles";
import { Section } from "@/components/layout/section";
import { AutoCompList } from "@/features/comps/components/auto-comp-list";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { championGames } from "@/features/stats/format";
import { ChampionForms } from "@/features/stats/components/champion-forms";
import { otherForms } from "@/lib/game/forms";
import { ItemBuilds } from "@/features/stats/components/item-builds";
import { PlacementChart } from "@/features/stats/components/placement-chart";
import { PatchHistoryChart } from "@/features/stats/components/patch-trend";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { StatTable } from "@/features/stats/components/stat-table";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useChampionStats, useGameData, useStats } from "@/lib/data/hooks";
import type { Champion, ChampionStats } from "@/lib/data/schema";
import { traitBreakpoint, traitKey, traitStyle } from "@/lib/game/traits";

export const Route = createFileRoute("/champions_/$apiName")({
  head: () => ({ meta: [{ title: "Champion Stats · TFTeam" }] }),
  component: ChampionPage,
});

/** What the champion's tables' play rates are a share of. */
const gamesOf = (stats: ChampionStats, championsByApi: Map<string, Champion>) =>
  championGames(championsByApi.get(stats.apiName)?.name);

function Partners({ stats }: { stats: ChampionStats }) {
  const { championsByApi } = useGameData();
  return (
    <StatTable
      search="Search champions"
      playBaseline={gamesOf(stats, championsByApi)}
      rows={stats.partners.flatMap((partner) => {
        const champion = championsByApi.get(partner.unit);
        if (!champion) return [];
        return [
          {
            key: partner.unit,
            name: champion.name,
            label: <ChampionLink champion={champion} />,
            line: partner,
          },
        ];
      })}
    />
  );
}

function Traits({ stats }: { stats: ChampionStats }) {
  const { championsByApi, traitsByApi } = useGameData();
  return (
    <StatTable
      search="Search traits"
      playBaseline={gamesOf(stats, championsByApi)}
      rows={stats.traits.flatMap((entry) => {
        const found = traitBreakpoint(traitKey(entry.trait, entry.minUnits), traitsByApi);
        if (!found) return [];
        const { trait, breakpoint } = found;
        return [
          {
            key: traitKey(entry.trait, entry.minUnits),
            name: trait.name,
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
  const { championsByApi } = useGameData();
  return (
    <StatTable
      showDelta={false}
      playBaseline={gamesOf(stats, championsByApi)}
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
  const stats = useStats();
  const line = stats?.units[champion.apiName];
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
        {line && <StatSummary line={line} play="of games" />}
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

  if (!champion) return <MissingEntry kind="champion" apiName={apiName} />;
  const places = setStats?.units[champion.apiName]?.places;

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
            <NoStats subject={champion.name} />
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
          {places && (
            <Section title="Placements">
              <PlacementChart places={places} />
            </Section>
          )}
          {stats && (
            <Section title="Patch history">
              <PatchHistoryChart kind="units" entry={champion.apiName} />
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

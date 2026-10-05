import { parseRank } from "@/features/stats/scope";
import type { AutoComp, RankFloor, SetStats } from "@/lib/data/schema";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Hammer, NotebookPen } from "lucide-react";
import { ChampionCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { CompBoard } from "@/features/comps/components/comp-board";
import { CopyTeamCodeButton } from "@/features/comps/components/copy-team-code-button";
import { ExploreCompButton } from "@/features/comps/components/explore-comp-button";
import { Section } from "@/components/layout/section";
import { Carries, CompTraits } from "@/features/comps/components/comp-sections";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { useAutoCompUnits } from "@/features/comps/use-auto-comp-units";
import { useOpenInBuilder } from "@/features/comps/use-open-in-builder";
import { PlacementChart } from "@/features/stats/components/placement-chart";
import { StatTable } from "@/features/stats/components/stat-table";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { percent, share } from "@/features/stats/format";
import { findComp } from "@/lib/game/comp-signature";
import { stageRound } from "@/lib/game/rounds";
import { useActiveSet, useAutoComps, useGameData, useTierStats } from "@/lib/data/hooks";

export const Route = createFileRoute("/comps/auto/$id")({
  head: () => ({ meta: [{ title: "Comp Stats · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): { rank?: RankFloor } => ({
    rank: parseRank(search.rank),
  }),
  component: AutoCompPage,
});

/** When the comp tends to bow out when it loses: early-game strength versus a late spike. */
function KnockoutRound({ round }: { round?: number }) {
  if (round === undefined) return null;
  return (
    <dl className="mt-3 border-t pt-3 text-xs" title="Median round it's knocked out on, in games it doesn't win">
      <dt className="text-muted-foreground">Out around</dt>
      <dd className="font-display text-base font-semibold tabular-nums">{stageRound(round)}</dd>
    </dl>
  );
}

function UnitFrequencies({ units }: { units: { apiName: string; frequency: number }[] }) {
  const { championsByApi } = useGameData();
  return (
    <ul className="flex flex-wrap gap-2">
      {units.map((unit) => {
        const champion = championsByApi.get(unit.apiName);
        if (!champion) return null;
        return (
          <li key={unit.apiName} className="flex w-12 flex-col items-center gap-0.5">
            <GameHoverCard content={<ChampionCard champion={champion} />}>
              <Link to="/champions/$apiName" params={{ apiName: champion.apiName }} className="rounded-md">
                <ChampionIcon champion={champion} className="size-11" />
              </Link>
            </GameHoverCard>
            <span className="text-[11px] text-muted-foreground tabular-nums">{percent(unit.frequency)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Placement by who held the items at the end; boards that go out early still have them on earlier carries. */
function CarryProgression({ progression }: { progression: AutoComp["progression"] }) {
  const { championsByApi } = useGameData();
  if (progression.length < 2) return null;
  return (
    <Section title="Carry progression">
      <p className="mb-2 text-xs text-muted-foreground">
        Who held the items at the end. Boards that go out early still have them on earlier carries, so later carries
        place better.
      </p>
      <StatTable
        showDelta={false}
        keepOrder
        playBaseline="this comp's games"
        rows={progression.map((stage) => ({
          key: stage.carries.join("+"),
          label: (
            <span className="flex items-center gap-1">
              {stage.carries.map((apiName) => {
                const champion = championsByApi.get(apiName);
                return champion ? <ChampionIcon key={apiName} champion={champion} className="size-6" /> : null;
              })}
              <span className="ml-1 truncate">
                {stage.carries.map((apiName) => championsByApi.get(apiName)?.name ?? apiName).join(" & ")}
              </span>
            </span>
          ),
          line: stage,
        }))}
      />
    </Section>
  );
}

function AutoCompPage() {
  const { id } = Route.useParams();
  const { rank } = Route.useSearch();
  const stats = useTierStats(rank);
  const comps = useAutoComps(rank);
  const comp = comps && findComp(comps, id);

  if (!stats) return <NoStats subject="this comp" />;
  if (!comp)
    return <EmptyState>This comp isn't in the current stats. It may have dropped below the thresholds.</EmptyState>;
  return <AutoCompDetail comp={comp} stats={stats} />;
}

function AutoCompDetail({ comp, stats }: { comp: AutoComp; stats: SetStats }) {
  const { set } = useActiveSet();
  const { units, guide } = useAutoCompUnits(comp);
  const openInBuilder = useOpenInBuilder();

  return (
    <div className="space-y-6">
      <Link
        to="/tierlist/comps"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Comp Tier List
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        {comp.tier && <TierBadge tier={comp.tier} className="size-14 text-3xl" />}
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{comp.name}</h1>
          <StatSummary line={comp} className="text-sm" />
          <p className="text-sm text-muted-foreground">
            Usually played at level {comp.level} · {share(comp.play)} of boards
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => openInBuilder(set, [{ level: comp.level, units }], comp.name, { guide: comp.id })}
          >
            <NotebookPen /> Write a guide
          </Button>
          <CopyTeamCodeButton apiNames={units.map((unit) => unit.apiName)} />
          <ExploreCompButton signature={comp.signature} />
          <Button onClick={() => openInBuilder(set, [{ level: comp.level, units }], comp.name)}>
            <Hammer /> Open in Team Builder
          </Button>
        </div>
      </header>
      <StatsMeta stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <CompBoard units={units} className="max-w-2xl" />
          <p className="text-xs text-muted-foreground">
            {guide ? (
              <>
                Positioned like the{" "}
                <Link to="/comps/$slug" params={{ slug: guide.slug }} className="underline hover:text-foreground">
                  {guide.name}
                </Link>{" "}
                guide; units it doesn&apos;t include are placed by attack range.
              </>
            ) : (
              "Match data doesn't include positions, so units are placed by attack range: melee in front, mid-range behind them, ranged at the back, with ranged carries in the corners."
            )}
          </p>
          <Section title="Core units">
            <UnitFrequencies units={comp.units} />
          </Section>
          {comp.flex.length > 0 && (
            <Section title="Flex units">
              <UnitFrequencies units={comp.flex} />
            </Section>
          )}
          <CarryProgression progression={comp.progression} />
        </div>
        <aside className="space-y-4">
          {comp.places && (
            <Section title="Placements">
              <PlacementChart places={comp.places} />
              <KnockoutRound round={comp.knockoutRound} />
            </Section>
          )}
          {comp.byLevel.length > 1 && (
            <Section title="By final level">
              <StatTable
                showDelta={false}
                keepOrder
                playBaseline="this comp's games"
                rows={comp.byLevel.map((line) => ({ key: String(line.level), label: `Level ${line.level}`, line }))}
              />
            </Section>
          )}
          <Section title="Traits">
            <CompTraits units={units} />
          </Section>
          <Section title="Carries & items">
            <Carries units={units} />
          </Section>
        </aside>
      </div>
    </div>
  );
}

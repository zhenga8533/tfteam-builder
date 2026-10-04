import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { NoStats } from "@/features/stats/components/no-stats";
import { TrendBadge } from "@/features/stats/components/patch-trend";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { MIN_TREND } from "@/features/stats/format";
import { useUpdateSearch } from "@/lib/use-update-search";
import { parseRank } from "@/features/stats/scope";
import { useGameData, useTierStats } from "@/lib/data/hooks";
import type { PatchTrend, RankFloor, SetStats, StatLine } from "@/lib/data/schema";
import { traitBreakpoint, traitStyle } from "@/lib/game/traits";

export const Route = createFileRoute("/tierlist/changes")({
  head: () => ({ meta: [{ title: "Patch Changes · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): { rank?: RankFloor } => ({
    rank: parseRank(search.rank),
  }),
  component: PatchChangesPage,
});

/** Entries listed per direction and kind. */
const SHOWN = 8;

interface Mover {
  key: string;
  delta: number;
  line: StatLine;
  label: ReactNode;
}

function MoverList({ title, movers }: { title: string; movers: Mover[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
      {movers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No big moves.</p>
      ) : (
        <ul className="space-y-1.5">
          {movers.map((mover) => (
            <li key={mover.key} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">{mover.label}</span>
              <AvgPlacement line={mover.line} className="w-10 text-right" />
              <TrendBadge delta={mover.delta} className="w-12 justify-end" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The biggest improvements and drops in one category, by change in average placement. */
function Movers({ title, movers }: { title: string; movers: Mover[] }) {
  const sorted = movers.filter((mover) => Math.abs(mover.delta) >= MIN_TREND).toSorted((a, b) => a.delta - b.delta);
  return (
    <Section title={title}>
      <div className="grid gap-6 sm:grid-cols-2">
        <MoverList title="Better" movers={sorted.filter((mover) => mover.delta < 0).slice(0, SHOWN)} />
        <MoverList
          title="Worse"
          movers={sorted
            .filter((mover) => mover.delta > 0)
            .reverse()
            .slice(0, SHOWN)}
        />
      </div>
    </Section>
  );
}

function useMovers(trend: PatchTrend, stats: SetStats) {
  const { championsByApi, itemsByApi, traitsByApi } = useGameData();
  const units = Object.entries(trend.units).flatMap(([apiName, delta]) => {
    const champion = championsByApi.get(apiName);
    const line = stats.units[apiName];
    return champion && line ? [{ key: apiName, delta, line, label: <ChampionLink champion={champion} /> }] : [];
  });
  const items = Object.entries(trend.items).flatMap(([apiName, delta]) => {
    const item = itemsByApi.get(apiName);
    const line = stats.items[apiName];
    return item && line && item.kind !== "component"
      ? [{ key: apiName, delta, line, label: <ItemLink item={item} /> }]
      : [];
  });
  const traits = Object.entries(trend.traits).flatMap(([key, delta]) => {
    const found = traitBreakpoint(key, traitsByApi);
    if (!found) return [];
    const { trait, breakpoint } = found;
    const line = stats.traits.find((entry) => entry.trait === trait.apiName && entry.minUnits === breakpoint.minUnits);
    if (!line) return [];
    return [
      {
        key,
        delta,
        line,
        label: (
          <TraitLink
            trait={trait}
            style={traitStyle(breakpoint.style)}
            count={breakpoint.minUnits}
            label={`${breakpoint.minUnits} ${trait.name}`}
          />
        ),
      },
    ];
  });
  return { units, items, traits };
}

function Changes({ trend, stats }: { trend: PatchTrend; stats: SetStats }) {
  const { units, items, traits } = useMovers(trend, stats);
  return (
    <div className="space-y-6">
      <Movers title="Champions" movers={units} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Movers title="Items" movers={items} />
        <Movers title="Traits" movers={traits} />
      </div>
    </div>
  );
}

function PatchChangesPage() {
  const { rank } = Route.useSearch();
  const stats = useTierStats(rank);
  const update = useUpdateSearch<{ rank?: RankFloor }>();
  const trend = stats?.trend;
  return (
    <>
      <PageHeader
        title="Patch Changes"
        description={
          trend
            ? `What moved the most between patch ${trend.patch} and ${stats.patch}, by change in average placement.`
            : "What moved the most since the previous patch, by change in average placement."
        }
      />
      {stats && <StatsMeta stats={stats} onRankChange={(rank) => update({ rank })} />}
      {!stats ? (
        <NoStats />
      ) : trend ? (
        <Changes trend={trend} stats={stats} />
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Changes appear once there are stats for two patches of Set {stats.set}; so far there's only patch{" "}
          {stats.patch}.
        </p>
      )}
    </>
  );
}

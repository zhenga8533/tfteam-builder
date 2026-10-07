import { createFileRoute } from "@tanstack/react-router";
import { ChampionCard } from "@/components/game/cards";
import { ChampionFilterBar } from "@/components/game/filters";
import { type ChampionFilters, matchesChampionFilters, parseChampionFilters } from "@/components/game/filter-params";
import { ChampionIcon } from "@/components/game/icons";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { parseStatsScope, scopeChoices, type StatsScope } from "@/features/stats/scope";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useTierStats } from "@/lib/data/hooks";
import { useUpdateSearch } from "@/lib/use-update-search";

interface ChampionTierSearch extends StatsScope, ChampionFilters {}

export const Route = createFileRoute("/tierlist/champions")({
  head: () => ({ meta: [{ title: "Champion Tier List · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): ChampionTierSearch => ({
    ...parseStatsScope(search),
    ...parseChampionFilters(search),
  }),
  component: ChampionTierListPage,
});

function ChampionTierListPage() {
  const { set } = useActiveSet();
  const { championsByApi } = useGameData();
  const search = Route.useSearch();
  const stats = useTierStats(search.rank, search.region, search.patch);
  const lines = Object.entries(stats?.units ?? {}).filter(([apiName]) => championsByApi.has(apiName));
  const update = useUpdateSearch<ChampionTierSearch>();
  const visible = (apiName: string) => {
    const champion = championsByApi.get(apiName);
    return !!champion && matchesChampionFilters(champion, search);
  };

  return (
    <StatTierList
      title="Champion Tier List"
      entries="champions"
      description={`Set ${set} champions ranked by average placement in ranked games.`}
      lines={lines}
      overrides={tierListForSet(set)?.champions}
      fallback={tierListForSet(set)?.fallback?.champions}
      visible={visible}
      stats={stats}
      {...scopeChoices(search, update)}
      toolbar={<ChampionFilterBar value={search} onChange={update} />}
      renderEntry={(apiName, line) => {
        const champion = championsByApi.get(apiName);
        if (!champion) return null;
        return (
          <TierEntry
            icon={<ChampionIcon champion={champion} decorative className="size-12" />}
            label={champion.name}
            line={line}
            link={{ to: "/champions/$apiName", params: { apiName: champion.apiName } }}
            trend={<StatTrend trend={stats?.trend} kind="units" entry={apiName} />}
            play="of games"
            card={<ChampionCard champion={champion} />}
          />
        );
      }}
    />
  );
}

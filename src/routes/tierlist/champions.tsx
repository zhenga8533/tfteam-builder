import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChampionCard } from "@/components/game/cards";
import { CostFilter, TraitFilter } from "@/components/game/filters";
import { ChampionIcon } from "@/components/game/icons";
import { SearchInput } from "@/components/layout/search-input";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";
import { matches, numberParam, stringParam } from "@/lib/search";

interface ChampionTierSearch {
  q?: string;
  cost?: number;
  trait?: string;
}

export const Route = createFileRoute("/tierlist/champions")({
  head: () => ({ meta: [{ title: "Champion Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): ChampionTierSearch => ({
    q: stringParam(search.q),
    cost: numberParam(search.cost),
    trait: stringParam(search.trait),
  }),
  component: ChampionTierListPage,
});

function ChampionTierListPage() {
  const { set } = useActiveSet();
  const { championsByApi } = useGameData();
  const stats = useStats();
  const lines = Object.entries(stats?.units ?? {}).filter(([apiName]) => championsByApi.has(apiName));
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const update = (patch: Partial<ChampionTierSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const visible = (apiName: string) => {
    const champion = championsByApi.get(apiName);
    return (
      !!champion &&
      matches(champion.name, search.q) &&
      (search.cost === undefined || champion.cost === search.cost) &&
      (!search.trait || champion.traits.includes(search.trait))
    );
  };

  return (
    <StatTierList
      title="Champion Tier List"
      description={`Set ${set} champions ranked by average placement in ranked games.`}
      lines={lines}
      overrides={tierListForSet(set)?.champions}
      visible={visible}
      toolbar={
        <>
          <SearchInput
            value={search.q ?? ""}
            onChange={(q) => update({ q: q || undefined })}
            placeholder="Search champions"
          />
          <CostFilter value={search.cost} onChange={(cost) => update({ cost })} />
          <TraitFilter value={search.trait} onChange={(trait) => update({ trait })} />
        </>
      }
      renderEntry={(apiName, line) => {
        const champion = championsByApi.get(apiName);
        if (!champion) return null;
        return (
          <TierEntry
            icon={<ChampionIcon champion={champion} className="size-12" />}
            label={champion.name}
            line={line}
            link={{ to: "/champions/$apiName", params: { apiName: champion.apiName } }}
            trend={<StatTrend kind="units" entry={apiName} />}
            card={<ChampionCard champion={champion} />}
          />
        );
      }}
    />
  );
}

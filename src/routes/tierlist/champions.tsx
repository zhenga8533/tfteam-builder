import { createFileRoute } from "@tanstack/react-router";
import { ChampionCard } from "@/components/game/cards";
import { ChampionIcon } from "@/components/game/icons";
import { tierListForSet } from "@/content";
import { ChampionForms } from "@/features/stats/components/champion-forms";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";

export const Route = createFileRoute("/tierlist/champions")({
  head: () => ({ meta: [{ title: "Champion Tier List · TFTeam Builder" }] }),
  component: ChampionTierListPage,
});

function ChampionTierListPage() {
  const { set } = useActiveSet();
  const { championsByApi } = useGameData();
  const stats = useStats();
  const lines = Object.entries(stats?.units ?? {}).filter(([apiName]) => championsByApi.has(apiName));

  return (
    <StatTierList
      title="Champion Tier List"
      description={`Set ${set} champions ranked by average placement in ranked games.`}
      lines={lines}
      overrides={tierListForSet(set)?.champions}
      renderEntry={(apiName, line) => {
        const champion = championsByApi.get(apiName);
        if (!champion) return null;
        return (
          <TierEntry
            icon={<ChampionIcon champion={champion} className="size-12" />}
            label={champion.name}
            line={line}
            card={
              <div className="space-y-3">
                <ChampionCard champion={champion} />
                <ChampionForms champion={champion} className="border-t pt-3" />
              </div>
            }
          />
        );
      }}
    />
  );
}

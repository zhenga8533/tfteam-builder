import { createFileRoute } from "@tanstack/react-router";
import { ItemCard } from "@/components/game/cards";
import { ItemIcon } from "@/components/game/icons";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";

export const Route = createFileRoute("/tierlist/items")({
  head: () => ({ meta: [{ title: "Item Tier List · TFTeam Builder" }] }),
  component: ItemTierListPage,
});

function ItemTierListPage() {
  const { set } = useActiveSet();
  const { itemsByApi } = useGameData();
  const stats = useStats();
  // Components are carried around mid-game rather than built, so they aren't ranked.
  const lines = Object.entries(stats?.items ?? {}).filter(
    ([apiName]) => itemsByApi.has(apiName) && itemsByApi.get(apiName)?.kind !== "component",
  );

  return (
    <StatTierList
      title="Item Tier List"
      description={`Set ${set} items ranked by the average placement of the units holding them.`}
      lines={lines}
      overrides={tierListForSet(set)?.items}
      renderEntry={(apiName, line) => {
        const item = itemsByApi.get(apiName);
        if (!item) return null;
        return (
          <TierEntry
            icon={<ItemIcon item={item} className="size-12" />}
            label={item.name}
            line={line}
            link={{ to: "/items/$apiName", params: { apiName: item.apiName } }}
            card={<ItemCard item={item} />}
          />
        );
      }}
    />
  );
}

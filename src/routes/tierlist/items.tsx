import { createFileRoute } from "@tanstack/react-router";
import { ItemCard } from "@/components/game/cards";
import { ItemKindFilter } from "@/components/game/filters";
import { ItemIcon } from "@/components/game/icons";
import { SearchInput } from "@/components/layout/search-input";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { ITEM_KINDS } from "@/lib/data/constants";
import { useActiveSet, useGameData, useTierStats } from "@/lib/data/hooks";
import type { ItemKind } from "@/lib/data/schema";
import { useUpdateSearch } from "@/lib/use-update-search";
import { isRankFloor, isRegion, type Region } from "@/lib/data/constants";
import type { RankFloor } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";

interface ItemTierSearch {
  rank?: RankFloor;
  region?: Region;
  q?: string;
  kind?: ItemKind;
}

const RANKED_KINDS: ItemKind[] = ITEM_KINDS.filter((kind) => kind !== "component");

export const Route = createFileRoute("/tierlist/items")({
  head: () => ({ meta: [{ title: "Item Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): ItemTierSearch => ({
    rank: isRankFloor(search.rank) ? search.rank : undefined,
    region: isRegion(search.region) ? search.region : undefined,
    q: stringParam(search.q),
    kind: RANKED_KINDS.includes(search.kind as ItemKind) ? (search.kind as ItemKind) : undefined,
  }),
  component: ItemTierListPage,
});

function ItemTierListPage() {
  const { set } = useActiveSet();
  const { itemsByApi } = useGameData();
  const search = Route.useSearch();
  const stats = useTierStats(search.rank, search.region);
  // Components are carried around mid-game rather than built, so they aren't ranked.
  const lines = Object.entries(stats?.items ?? {}).filter(
    ([apiName]) => itemsByApi.has(apiName) && itemsByApi.get(apiName)?.kind !== "component",
  );
  const update = useUpdateSearch<ItemTierSearch>();
  const kinds = RANKED_KINDS.filter((kind) => lines.some(([apiName]) => itemsByApi.get(apiName)?.kind === kind));
  const visible = (apiName: string) => {
    const item = itemsByApi.get(apiName);
    return !!item && matches(item.name, search.q) && (!search.kind || item.kind === search.kind);
  };

  return (
    <StatTierList
      title="Item Tier List"
      entries="items"
      description={`Set ${set} items ranked by the average placement of the units holding them.`}
      lines={lines}
      overrides={tierListForSet(set)?.items}
      fallback={tierListForSet(set)?.fallback?.items}
      visible={visible}
      stats={stats}
      rank={{ value: search.rank, onChange: (rank) => update({ rank, region: undefined }) }}
      region={{ value: search.region, onChange: (region) => update({ region, rank: undefined }) }}
      toolbar={
        <>
          <SearchInput
            value={search.q ?? ""}
            onChange={(q) => update({ q: q || undefined })}
            placeholder="Search items"
          />
          <ItemKindFilter kinds={kinds} value={search.kind} onChange={(kind) => update({ kind })} allowNone />
        </>
      }
      renderEntry={(apiName, line) => {
        const item = itemsByApi.get(apiName);
        if (!item) return null;
        return (
          <TierEntry
            icon={<ItemIcon item={item} decorative className="size-12" />}
            label={item.name}
            line={line}
            link={{ to: "/items/$apiName", params: { apiName: item.apiName } }}
            trend={<StatTrend kind="items" entry={apiName} />}
            card={<ItemCard item={item} />}
          />
        );
      }}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { tierListForSet } from "@/content";
import { TierRows } from "@/features/comps/components/tier-rows";
import { useActiveSet, useGameData } from "@/lib/data/hooks";

export const Route = createFileRoute("/tierlist/items")({
  head: () => ({ meta: [{ title: "Item Tier List · TFTeam Builder" }] }),
  component: ItemTierListPage,
});

function ItemTierListPage() {
  const { set } = useActiveSet();
  const { itemsByApi } = useGameData();
  const tierList = tierListForSet(set);

  return (
    <>
      <PageHeader
        title="Item Tier List"
        description={
          tierList ? `Best items to build in Set ${set}. Last updated ${tierList.updatedAt}.` : `Set ${set} items.`
        }
      />
      {!tierList ? (
        <EmptyState>No item tier list has been written for Set {set} yet.</EmptyState>
      ) : (
        <TierRows
          rows={tierList.items}
          renderRow={(apiNames) => (
            <ul className="flex flex-wrap gap-3">
              {apiNames.map((apiName) => {
                const item = itemsByApi.get(apiName);
                if (!item) return null;
                return (
                  <li key={apiName} className="w-16">
                    <GameHoverCard content={<ItemCard item={item} />}>
                      <span
                        tabIndex={0}
                        className="flex flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-2"
                      >
                        <ItemIcon item={item} className="size-12" />
                        <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">
                          {item.name}
                        </span>
                      </span>
                    </GameHoverCard>
                  </li>
                );
              })}
            </ul>
          )}
        />
      )}
    </>
  );
}

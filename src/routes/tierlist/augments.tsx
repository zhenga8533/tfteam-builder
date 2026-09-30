import { createFileRoute } from "@tanstack/react-router";
import { AugmentCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { AugmentIcon } from "@/components/game/icons";
import { AUGMENT_TIER_TEXT } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { tierListForSet } from "@/content";
import { TierRows } from "@/features/comps/components/tier-rows";
import { useActiveSet, useGameData } from "@/lib/data/hooks";

export const Route = createFileRoute("/tierlist/augments")({
  head: () => ({ meta: [{ title: "Augment Tier List · TFTeam Builder" }] }),
  component: AugmentTierListPage,
});

function AugmentTierListPage() {
  const { set } = useActiveSet();
  const { augmentsByApi } = useGameData();
  const tierList = tierListForSet(set);

  return (
    <>
      <PageHeader
        title="Augment Tier List"
        description={
          tierList ? `Augment rankings for Set ${set}. Last updated ${tierList.updatedAt}.` : `Set ${set} augments.`
        }
      />
      {!tierList ? (
        <EmptyState>No augment tier list has been written for Set {set} yet.</EmptyState>
      ) : (
        <TierRows
          rows={tierList.augments}
          renderRow={(apiNames) => (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {apiNames.map((apiName) => {
                const augment = augmentsByApi.get(apiName);
                if (!augment) return null;
                return (
                  <li key={apiName}>
                    <GameHoverCard content={<AugmentCard augment={augment} />}>
                      <span
                        tabIndex={0}
                        className="flex items-center gap-2 rounded-md p-1 outline-none hover:bg-accent/50 focus-visible:ring-2"
                      >
                        <AugmentIcon augment={augment} className="size-9" />
                        <span className={`text-sm font-medium ${AUGMENT_TIER_TEXT[augment.tier]}`}>{augment.name}</span>
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

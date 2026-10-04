import { createFileRoute } from "@tanstack/react-router";
import { AugmentCard } from "@/components/game/cards";
import { AugmentFilterBar } from "@/components/game/filters";
import { type AugmentFilters, matchesAugmentFilters, parseAugmentFilters } from "@/components/game/filter-params";
import { AugmentIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { tierListForSet } from "@/content";
import type { TierRows as TierRowsData } from "@/content/types";
import { TierRows } from "@/features/comps/components/tier-rows";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { useUpdateSearch } from "@/lib/use-update-search";

export const Route = createFileRoute("/tierlist/augments")({
  head: () => ({ meta: [{ title: "Augment Tier List · TFTeam Builder" }] }),
  validateSearch: parseAugmentFilters,
  component: AugmentTierListPage,
});

function AugmentTierListPage() {
  const { set } = useActiveSet();
  const { augmentsByApi } = useGameData();
  const tierList = tierListForSet(set);
  const search = Route.useSearch();
  const update = useUpdateSearch<AugmentFilters>();

  const visible = (apiName: string) => {
    const augment = augmentsByApi.get(apiName);
    return !!augment && matchesAugmentFilters(augment, search);
  };
  const rows: TierRowsData = Object.fromEntries(
    Object.entries(tierList?.augments ?? {})
      .map(([tier, apiNames]) => [tier, (apiNames ?? []).filter(visible)] as const)
      .filter(([, apiNames]) => apiNames.length > 0),
  );

  return (
    <>
      <PageHeader
        title="Augment Tier List"
        description={
          tierList
            ? `Set ${set} augments ranked by hand; Riot's match data doesn't include augments. Updated ${tierList.updatedAt}.`
            : `Set ${set} augments.`
        }
      />
      {!tierList ? (
        <EmptyState>No augment tier list has been written for Set {set} yet.</EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <AugmentFilterBar value={search} onChange={update} />
          </div>
          {Object.keys(rows).length === 0 ? (
            <EmptyState>No augments match these filters.</EmptyState>
          ) : (
            <TierRows
              rows={rows}
              renderRow={(apiNames) => (
                <ul className="flex flex-wrap gap-3">
                  {apiNames.map((apiName) => {
                    const augment = augmentsByApi.get(apiName);
                    if (!augment) return null;
                    return (
                      <li key={apiName}>
                        <TierEntry
                          icon={<AugmentIcon augment={augment} decorative className="size-12" />}
                          label={augment.name}
                          line={undefined}
                          card={<AugmentCard augment={augment} />}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            />
          )}
        </>
      )}
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AugmentCard } from "@/components/game/cards";
import { AugmentTierFilter } from "@/components/game/filters";
import { isAugmentTier } from "@/components/game/styles";
import { AugmentIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { tierListForSet } from "@/content";
import type { TierRows as TierRowsData } from "@/content/types";
import { TierRows } from "@/features/comps/components/tier-rows";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import type { AugmentTier } from "@/lib/data/schema";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, numberParam, stringParam } from "@/lib/search";

interface AugmentTierSearch {
  q?: string;
  tier?: AugmentTier;
}

export const Route = createFileRoute("/tierlist/augments")({
  head: () => ({ meta: [{ title: "Augment Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): AugmentTierSearch => {
    const tier = numberParam(search.tier);
    return { q: stringParam(search.q), tier: isAugmentTier(tier) ? tier : undefined };
  },
  component: AugmentTierListPage,
});

function AugmentTierListPage() {
  const { set } = useActiveSet();
  const { augmentsByApi } = useGameData();
  const tierList = tierListForSet(set);
  const search = Route.useSearch();
  const update = useUpdateSearch<AugmentTierSearch>();

  const visible = (apiName: string) => {
    const augment = augmentsByApi.get(apiName);
    return !!augment && matches(augment.name, search.q) && (!search.tier || augment.tier === search.tier);
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
            <SearchInput
              value={search.q ?? ""}
              onChange={(q) => update({ q: q || undefined })}
              placeholder="Search augments"
            />
            <AugmentTierFilter value={search.tier} onChange={(tier) => update({ tier })} />
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
                          icon={<AugmentIcon augment={augment} className="size-12" />}
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

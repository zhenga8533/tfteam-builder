import { createFileRoute } from "@tanstack/react-router";
import { AugmentCard } from "@/components/game/cards";
import { AugmentTierFilter } from "@/components/game/filters";
import { isAugmentTier } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { useGameData } from "@/lib/data/hooks";
import type { AugmentTier } from "@/lib/data/schema";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, numberParam, stringParam } from "@/lib/search";

interface AugmentSearch {
  q?: string;
  tier?: AugmentTier;
}

export const Route = createFileRoute("/augments")({
  head: () => ({ meta: [{ title: "Augments · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): AugmentSearch => {
    const tier = numberParam(search.tier);
    return { q: stringParam(search.q), tier: isAugmentTier(tier) ? tier : undefined };
  },
  component: AugmentsPage,
});

function AugmentsPage() {
  const { augments } = useGameData();
  const search = Route.useSearch();
  const filtered = augments.filter(
    (augment) => matches(augment.name, search.q) && (search.tier === undefined || augment.tier === search.tier),
  );

  const update = useUpdateSearch<AugmentSearch>();

  return (
    <>
      <PageHeader
        title="Augments"
        description={`${augments.length} silver, gold and prismatic augments available this set.`}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search.q ?? ""}
          onChange={(q) => update({ q: q || undefined })}
          placeholder="Search augments"
        />
        <AugmentTierFilter value={search.tier} onChange={(tier) => update({ tier })} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No augments match these filters.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((augment) => (
            // content-visibility skips rendering off-screen cards; there are several hundred augments.
            <Card key={augment.apiName} className="py-4 [contain-intrinsic-size:auto_9rem] [content-visibility:auto]">
              <CardContent className="px-4">
                <AugmentCard augment={augment} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

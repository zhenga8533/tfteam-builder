import { createFileRoute } from "@tanstack/react-router";
import { AugmentFilterBar } from "@/components/game/filters";
import { type AugmentFilters, matchesAugmentFilters, parseAugmentFilters } from "@/components/game/filter-params";
import { AugmentCard } from "@/components/game/cards";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useGameData } from "@/lib/data/hooks";
import { useUpdateSearch } from "@/lib/use-update-search";

export const Route = createFileRoute("/augments")({
  head: () => ({ meta: [{ title: "Augments · TFTeam" }] }),
  validateSearch: parseAugmentFilters,
  component: AugmentsPage,
});

function AugmentsPage() {
  const { augments } = useGameData();
  const search = Route.useSearch();
  const filtered = augments.filter((augment) => matchesAugmentFilters(augment, search));

  const update = useUpdateSearch<AugmentFilters>();

  return (
    <>
      <PageHeader
        title="Augments"
        description={`${augments.length} silver, gold and prismatic augments available this set.`}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <AugmentFilterBar value={search} onChange={update} />
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

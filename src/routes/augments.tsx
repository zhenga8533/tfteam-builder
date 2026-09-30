import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AugmentCard } from "@/components/game/cards";
import { AUGMENT_TIER_LABEL, AUGMENT_TIER_TEXT } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { AugmentTier } from "@/lib/data/schema";
import { matches, numberParam, stringParam } from "@/lib/search";

interface AugmentSearch {
  q?: string;
  tier?: AugmentTier;
}

const TIERS = [1, 2, 3] as const;
const isTier = (value: number | undefined): value is AugmentTier => TIERS.includes(value as AugmentTier);

export const Route = createFileRoute("/augments")({
  head: () => ({ meta: [{ title: "Augments · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): AugmentSearch => {
    const tier = numberParam(search.tier);
    return { q: stringParam(search.q), tier: isTier(tier) ? tier : undefined };
  },
  component: AugmentsPage,
});

function AugmentsPage() {
  const { augments } = useGameData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const filtered = augments.filter(
    (augment) => matches(augment.name, search.q) && (search.tier === undefined || augment.tier === search.tier),
  );

  const update = (patch: Partial<AugmentSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

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
        <ToggleGroup
          type="single"
          variant="outline"
          value={search.tier ? String(search.tier) : ""}
          onValueChange={(value) => update({ tier: value ? (Number(value) as AugmentTier) : undefined })}
          aria-label="Filter by tier"
        >
          {TIERS.map((tier) => (
            <ToggleGroupItem key={tier} value={String(tier)} className={`px-3 ${AUGMENT_TIER_TEXT[tier]}`}>
              {AUGMENT_TIER_LABEL[tier]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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

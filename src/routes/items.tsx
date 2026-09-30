import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { ITEM_KIND_LABELS } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ITEM_KINDS } from "@/lib/data/constants";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { Item, ItemKind } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";

interface ItemSearch {
  q?: string;
  kind?: ItemKind;
}

const isItemKind = (value: unknown): value is ItemKind => ITEM_KINDS.includes(value as ItemKind);

export const Route = createFileRoute("/items")({
  head: () => ({ meta: [{ title: "Items · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): ItemSearch => ({
    q: stringParam(search.q),
    kind: isItemKind(search.kind) ? search.kind : undefined,
  }),
  component: ItemsPage,
});

const recipeKey = (a: string, b: string) => [a, b].sort().join("|");

function HoverItem({ item, className }: { item: Item; className?: string }) {
  return (
    <GameHoverCard content={<ItemCard item={item} />}>
      <span tabIndex={0} className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ItemIcon item={item} className={className} />
      </span>
    </GameHoverCard>
  );
}

/** Component × component grid showing what each pair combines into. */
function CraftingTable() {
  const { items } = useGameData();
  const components = items.filter((item) => item.kind === "component");
  const byRecipe = new Map(
    items
      .filter((item) => item.composition.length === 2)
      .map((item) => [recipeKey(item.composition[0]!, item.composition[1]!), item]),
  );

  if (components.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold">Crafting table</h2>
      <div className="overflow-x-auto rounded-xl border bg-card p-3">
        <table className="mx-auto border-separate border-spacing-1">
          <thead>
            <tr>
              <th />
              {components.map((component) => (
                <th key={component.apiName} scope="col">
                  <HoverItem item={component} className="size-8 sm:size-10" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((row) => (
              <tr key={row.apiName}>
                <th scope="row">
                  <HoverItem item={row} className="size-8 sm:size-10" />
                </th>
                {components.map((column) => {
                  const item = byRecipe.get(recipeKey(row.apiName, column.apiName));
                  return (
                    <td key={column.apiName} className="bg-muted/40 p-0.5">
                      {item && <HoverItem item={item} className="size-8 sm:size-10" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ItemsPage() {
  const { items } = useGameData();
  const stats = useStats();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const kind = search.kind ?? "completed";
  const kinds = ITEM_KINDS.filter((option) => items.some((item) => item.kind === option));
  const filtered = items.filter((item) => item.kind === kind && matches(item.name, search.q));

  const update = (patch: Partial<ItemSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });

  return (
    <>
      <PageHeader title="Items" description="Recipes and effects for completed items, emblems, artifacts and more." />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search.q ?? ""}
          onChange={(q) => update({ q: q || undefined })}
          placeholder="Search items"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(value) => value && update({ kind: value as ItemKind })}
          className="flex-wrap"
          aria-label="Item category"
        >
          {kinds.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-3">
              {ITEM_KIND_LABELS[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {kind === "completed" && !search.q && <CraftingTable />}

      {filtered.length === 0 ? (
        <EmptyState>No items match these filters.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.apiName} className="py-4">
              <CardContent className="px-4">
                <ItemCard item={item} />
                {stats?.items[item.apiName] && (
                  <StatSummary line={stats.items[item.apiName]!} className="mt-3 border-t pt-3" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

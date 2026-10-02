import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ItemCard } from "@/components/game/cards";
import { ItemKindFilter } from "@/components/game/filters";
import { ChampionIcon, ItemIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { ITEM_KINDS } from "@/lib/data/constants";
import { AvgPlacement, StatSummary } from "@/features/stats/components/stat-summary";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { Item, ItemKind } from "@/lib/data/schema";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, stringParam } from "@/lib/search";
import { cn } from "@/lib/utils";

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

const TOP_HOLDERS = 6;

/** The champions that place best holding `item`, from each champion's best-items list. */
function TopHolders({ item }: { item: Item }) {
  const { championsByApi } = useGameData();
  const stats = useStats();
  const holders = Object.entries(stats?.bestItems ?? {})
    .flatMap(([unit, lines]) => {
      const line = lines.find((entry) => entry.item === item.apiName);
      const champion = championsByApi.get(unit);
      return line && champion ? [{ champion, line }] : [];
    })
    .sort((a, b) => a.line.score - b.line.score)
    .slice(0, TOP_HOLDERS);
  if (holders.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Best on</p>
      <ul className="flex flex-wrap gap-2">
        {holders.map(({ champion, line }) => (
          <li key={champion.apiName} className="flex w-12 flex-col items-center gap-0.5">
            <ChampionIcon champion={champion} className="size-10" />
            <AvgPlacement line={line} className="text-xs" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemDetails({ item }: { item: Item }) {
  const { itemsByApi } = useGameData();
  const stats = useStats();
  const line = stats?.items[item.apiName];
  const parts = item.composition.flatMap((apiName) => itemsByApi.get(apiName) ?? []);
  return (
    <div className="space-y-3">
      {parts.length === 2 && (
        <p className="flex items-center gap-2 text-muted-foreground" aria-label="Recipe">
          <ItemIcon item={parts[0]!} className="size-10" />+
          <ItemIcon item={parts[1]!} className="size-10" />=
          <ItemIcon item={item} className="size-12 ring-2 ring-primary" />
        </p>
      )}
      <ItemCard item={item} />
      {line && <StatSummary line={line} className="border-t pt-3" />}
      <TopHolders item={item} />
    </div>
  );
}

/**
 * Component × component grid; the panel beside it details whichever item is hovered or focused.
 * Hovering a component highlights everything it builds; hovering a recipe highlights its components.
 */
function CraftingTable() {
  const { items, itemsByApi } = useGameData();
  const components = items.filter((item) => item.kind === "component");
  const byRecipe = new Map(
    items
      .filter((item) => item.composition.length === 2)
      .map((item) => [recipeKey(item.composition[0]!, item.composition[1]!), item]),
  );
  const [active, setActive] = useState<string | null>(null);
  const shown = (active && itemsByApi.get(active)) ?? byRecipe.values().next().value;

  if (components.length === 0 || !shown) return null;

  const hoveredComponent = active && shown.kind === "component" ? shown.apiName : null;
  const highlighted = (item: Item) =>
    item.apiName === active ||
    (item.kind === "component" && shown.composition.includes(item.apiName) && active !== null);
  const dimmed = (item: Item) => hoveredComponent !== null && !item.composition.includes(hoveredComponent);

  const cell = (item: Item) => (
    <Link
      to="/items/$apiName"
      params={{ apiName: item.apiName }}
      onMouseEnter={() => setActive(item.apiName)}
      onFocus={() => setActive(item.apiName)}
      aria-label={item.name}
      className={cn(
        "block rounded-sm transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring",
        highlighted(item) && "ring-2 ring-primary",
        item.kind !== "component" && dimmed(item) && "opacity-30",
      )}
    >
      <ItemIcon item={item} className="size-8 sm:size-10" />
    </Link>
  );

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold">Crafting table</h2>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-3 lg:flex-row lg:items-start">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1">
            <thead>
              <tr>
                <th />
                {components.map((component) => (
                  <th key={component.apiName} scope="col">
                    {cell(component)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((row) => (
                <tr key={row.apiName}>
                  <th scope="row">{cell(row)}</th>
                  {components.map((column) => {
                    const item = byRecipe.get(recipeKey(row.apiName, column.apiName));
                    return (
                      <td key={column.apiName} className="rounded-sm bg-muted/40 p-0.5">
                        {item && cell(item)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="min-w-0 flex-1 rounded-lg border bg-background/40 p-4 lg:sticky lg:top-20" aria-live="polite">
          <ItemDetails item={shown} />
        </aside>
      </div>
    </section>
  );
}

function ItemsPage() {
  const { items } = useGameData();
  const stats = useStats();
  const search = Route.useSearch();
  const kind = search.kind ?? "completed";
  const kinds = ITEM_KINDS.filter((option) => items.some((item) => item.kind === option));
  const filtered = items.filter((item) => item.kind === kind && matches(item.name, search.q));

  const update = useUpdateSearch<ItemSearch>();

  return (
    <>
      <PageHeader title="Items" description="Recipes and effects for completed items, emblems, artifacts and more." />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search.q ?? ""}
          onChange={(q) => update({ q: q || undefined })}
          placeholder="Search items"
        />
        <ItemKindFilter kinds={kinds} value={kind} onChange={(next) => next && update({ kind: next })} />
      </div>

      {kind === "completed" && !search.q && <CraftingTable />}

      {filtered.length === 0 ? (
        <EmptyState>No items match these filters.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Link
              key={item.apiName}
              to="/items/$apiName"
              params={{ apiName: item.apiName }}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full py-4 transition-colors hover:border-primary/50">
                <CardContent className="px-4">
                  <ItemCard item={item} />
                  {stats?.items[item.apiName] && (
                    <StatSummary line={stats.items[item.apiName]!} className="mt-3 border-t pt-3" />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

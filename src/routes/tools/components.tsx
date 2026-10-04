import { createFileRoute } from "@tanstack/react-router";
import { Minus, RotateCcw } from "lucide-react";
import { Suspense } from "react";
import { ItemRecipe } from "@/components/game/cards";
import { ChampionFilter } from "@/components/game/filters";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemCard } from "@/components/game/cards";
import { ItemIcon } from "@/components/game/icons";
import { ItemLink } from "@/components/game/links";
import { EmptyState } from "@/components/layout/empty-state";
import { NoStats } from "@/features/stats/components/no-stats";
import { PageHeader } from "@/components/layout/page-header";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { Section } from "@/components/layout/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { useChampionStats, useGameData, useStats } from "@/lib/data/hooks";
import type { Item, StatLine } from "@/lib/data/schema";
import { bestBuildable, buildableItems, type ComponentCounts, componentValues } from "@/lib/game/components";
import { avgPlacementClass } from "@/features/stats/format";
import { cn } from "@/lib/utils";
import { stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

interface ComponentSearch {
  /** Held components as comma-separated apiNames, repeated per copy. */
  held?: string;
  carry?: string;
}

export const Route = createFileRoute("/tools/components")({
  head: () => ({ meta: [{ title: "Component Planner · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): ComponentSearch => ({
    held: stringParam(search.held),
    carry: stringParam(search.carry),
  }),
  component: ComponentPlannerPage,
});

/** A carry holds at most three items. */
const MAX_ITEMS = 3;

const toCounts = (held: string | undefined): ComponentCounts => {
  const counts: ComponentCounts = {};
  for (const apiName of (held ?? "").split(",").filter(Boolean)) counts[apiName] = (counts[apiName] ?? 0) + 1;
  return counts;
};

const toHeld = (counts: ComponentCounts) =>
  Object.entries(counts)
    .flatMap(([apiName, count]) => Array<string>(count).fill(apiName))
    .join(",") || undefined;

function ComponentPicker({
  counts,
  onChange,
}: {
  counts: ComponentCounts;
  onChange: (counts: ComponentCounts) => void;
}) {
  const { items } = useGameData();
  const components = items.filter((item) => item.kind === "component");
  const set = (apiName: string, count: number) => onChange({ ...counts, [apiName]: Math.max(0, count) });
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
      {components.map((component) => {
        const count = counts[component.apiName] ?? 0;
        return (
          <li key={component.apiName} className="flex flex-col items-center gap-1">
            <GameHoverCard content={<ItemCard item={component} />}>
              <button
                type="button"
                onClick={() => set(component.apiName, count + 1)}
                aria-label={`Add ${component.name} (${count} held)`}
                className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ItemIcon item={component} className={count ? "size-12" : "size-12 opacity-50 hover:opacity-80"} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            </GameHoverCard>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={count === 0}
              onClick={() => set(component.apiName, count - 1)}
              aria-label={`Remove a ${component.name}`}
            >
              <Minus />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function ItemRow({ item, line }: { item: Item; line?: StatLine }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <ItemLink item={item} className="min-w-0 flex-1" />
      <ItemRecipe item={item} />
      <span className="w-12 text-right">{line ? <AvgPlacement line={line} /> : "–"}</span>
    </li>
  );
}

/** For a chosen carry: the best builds the components allow, then every item ranked for that carry. */
function CarryPlan({ carry, counts, buildable }: { carry: string; counts: ComponentCounts; buildable: Item[] }) {
  const { itemsByApi, championsByApi } = useGameData();
  const stats = useChampionStats(carry);
  if (!stats) return <NoStats subject={championsByApi.get(carry)?.name} />;
  const builds = stats.builds.toSorted((a, b) => a.score - b.score);
  const totalComponents = Object.values(counts).reduce((total, count) => total + count, 0);
  const best = [MAX_ITEMS, 2]
    .filter((size) => size * 2 <= totalComponents)
    .map((size) => bestBuildable(builds, itemsByApi, counts, size))
    .find(Boolean);
  const single = new Map(builds.filter((build) => build.items.length === 1).map((build) => [build.items[0]!, build]));
  const ranked = buildable.toSorted(
    (a, b) => (single.get(a.apiName)?.score ?? Infinity) - (single.get(b.apiName)?.score ?? Infinity),
  );
  return (
    <>
      {best && (
        <Section title="Best build you can make">
          <div className="flex flex-wrap items-center gap-3">
            {best.items.map((apiName, index) => {
              const item = itemsByApi.get(apiName);
              return item ? <ItemLink key={index} item={item} iconClassName="size-10" /> : null;
            })}
            <span className="ml-auto text-sm text-muted-foreground">
              <AvgPlacement line={best} /> avg · {best.games} games
            </span>
          </div>
        </Section>
      )}
      <Section title="Everything you can make">
        <ul className="space-y-2">
          {ranked.map((item) => (
            <ItemRow key={item.apiName} item={item} line={single.get(item.apiName)} />
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Ranked by average placement when this champion holds it.</p>
      </Section>
    </>
  );
}

/** Components ranked by how well the items they build into place, for carousel picks. */
function CarouselPriority() {
  const { items } = useGameData();
  const stats = useStats();
  if (!stats) return null;
  const values = componentValues(items, stats.items);
  if (values.length === 0) return null;
  return (
    <Section title="Carousel priority">
      <ol className="space-y-2">
        {values.map(({ component, avg, builds, strong }, index) => (
          <li key={component.apiName} className="flex items-center gap-3 text-sm">
            <span className="w-4 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            <ItemLink item={component} className="min-w-0 flex-1" />
            <span
              className="flex gap-0.5"
              title={`${strong.length} of ${builds.length} items it builds are S or A tier`}
            >
              {strong.map((item) => (
                <ItemIcon key={item.apiName} item={item} className="size-5" />
              ))}
            </span>
            <span className={cn("w-10 text-right font-semibold tabular-nums", avgPlacementClass(avg))}>
              {avg.toFixed(2)}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Average placement of the items each component builds into, weighted by how often each is built; icons are its S
        and A tier items.
      </p>
    </Section>
  );
}

function ComponentPlannerPage() {
  const { items } = useGameData();
  const stats = useStats();
  const search = Route.useSearch();
  const update = useUpdateSearch<ComponentSearch>();
  const counts = toCounts(search.held);
  const buildable = buildableItems(
    items.filter((item) => item.kind === "completed"),
    counts,
  );

  return (
    <>
      <PageHeader
        title="Component Planner"
        description="Enter the components you're holding to see what they build, and the best items for your carry."
      />
      {stats && <StatsMeta stats={stats} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Section title="Your components">
            <ComponentPicker counts={counts} onChange={(next) => update({ held: toHeld(next) })} />
            {search.held && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => update({ held: undefined })}>
                <RotateCcw /> Clear
              </Button>
            )}
          </Section>
          <Section title="Carry">
            <ChampionFilter
              value={search.carry}
              onChange={(carry) => update({ carry })}
              placeholder="Any champion"
              className="w-full"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Pick the champion you're itemizing to rank items by how they do on them.
            </p>
          </Section>
          <CarouselPriority />
        </div>
        <div className="space-y-6">
          {buildable.length === 0 ? (
            <EmptyState>Add components to see what you can build.</EmptyState>
          ) : search.carry ? (
            <Suspense fallback={<Skeleton className="h-40" />}>
              <CarryPlan carry={search.carry} counts={counts} buildable={buildable} />
            </Suspense>
          ) : (
            <Section title="Everything you can make">
              <ul className="space-y-2">
                {buildable
                  .toSorted(
                    (a, b) =>
                      (stats?.items[a.apiName]?.score ?? Infinity) - (stats?.items[b.apiName]?.score ?? Infinity),
                  )
                  .map((item) => (
                    <ItemRow key={item.apiName} item={item} line={stats?.items[item.apiName]} />
                  ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Ranked by the average placement of units holding each item.
              </p>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

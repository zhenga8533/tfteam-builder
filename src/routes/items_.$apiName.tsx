import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ItemCard, ItemRecipe } from "@/components/game/cards";
import { ItemIcon } from "@/components/game/icons";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import { ITEM_KIND_LABELS } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { Section } from "@/components/layout/section";
import { AutoCompList } from "@/features/comps/components/auto-comp-list";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { PlacementChart } from "@/features/stats/components/placement-chart";
import { PatchHistoryChart } from "@/features/stats/components/patch-trend";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { StatTable } from "@/features/stats/components/stat-table";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { useGameData, useItemStats, useStats } from "@/lib/data/hooks";
import type { Item, ItemStats } from "@/lib/data/schema";

export const Route = createFileRoute("/items_/$apiName")({
  head: () => ({ meta: [{ title: "Item Stats · TFTeam" }] }),
  component: ItemPage,
});

function Holders({ stats }: { stats: ItemStats }) {
  const { championsByApi } = useGameData();
  return (
    <StatTable
      deltaBaseline="the champion's own average placement"
      playBaseline="each champion's games"
      search="Search champions"
      rows={stats.holders.flatMap((holder) => {
        const champion = championsByApi.get(holder.unit);
        return champion
          ? [{ key: holder.unit, name: champion.name, label: <ChampionLink champion={champion} />, line: holder }]
          : [];
      })}
    />
  );
}

function Pairs({ stats }: { stats: ItemStats }) {
  const { itemsByApi } = useGameData();
  return (
    <StatTable
      deltaBaseline="this item's average placement"
      playBaseline="games building this item"
      search="Search items"
      rows={stats.pairs.flatMap((pair) => {
        const item = itemsByApi.get(pair.item);
        return item ? [{ key: pair.item, name: item.name, label: <ItemLink item={item} />, line: pair }] : [];
      })}
    />
  );
}

/** For a component: the completed items it builds into, and what each needs alongside it. */
function BuildsInto({ item }: { item: Item }) {
  const { items, itemsByApi } = useGameData();
  const recipes = items.filter((other) => other.composition.includes(item.apiName));
  if (recipes.length === 0) return null;
  return (
    <Section title="Builds into">
      <ul className="space-y-1.5">
        {recipes.map((recipe) => {
          const partner = recipe.composition.find((part, index) => part !== item.apiName || index > 0);
          const other = partner ? itemsByApi.get(partner) : undefined;
          return (
            <li key={recipe.apiName} className="flex items-center gap-2 text-sm">
              {other && <ItemIcon item={other} className="size-6" title={other.name} />}
              <span className="text-muted-foreground">→</span>
              <ItemLink item={recipe} />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function ItemHeader({ item }: { item: Item }) {
  const { traitsByApi } = useGameData();
  const stats = useStats();
  const line = stats?.items[item.apiName];
  const trait = item.trait ? traitsByApi.get(item.trait) : undefined;
  return (
    <header className="flex flex-wrap items-center gap-4">
      <ItemIcon item={item} className="size-16" />
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">{item.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{ITEM_KIND_LABELS[item.kind]}</span>
          <ItemRecipe item={item} />
          {trait && <TraitLink trait={trait} iconClassName="size-4" />}
        </p>
        {line && <StatSummary line={line} play="of games" />}
      </div>
      {line?.tier && <TierBadge tier={line.tier} className="size-14 text-3xl" />}
    </header>
  );
}

function ItemPage() {
  const { apiName } = Route.useParams();
  const { itemsByApi } = useGameData();
  const setStats = useStats();
  const stats = useItemStats(apiName);
  const item = itemsByApi.get(apiName);

  if (!item) return <EmptyState>That item isn't in the selected set.</EmptyState>;

  return (
    <div className="space-y-6">
      <Link
        to="/items"
        search={{ kind: item.kind }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Items
      </Link>
      <ItemHeader item={item} />
      {setStats && <StatsMeta stats={setStats} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {stats ? (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <Section title="Best holders">
                  <Holders stats={stats} />
                </Section>
                <Section title="Built with">
                  <Pairs stats={stats} />
                </Section>
              </div>
              {stats.comps.length > 0 && (
                <Section title="Comps">
                  <AutoCompList ids={stats.comps} />
                </Section>
              )}
            </>
          ) : item.kind === "component" ? (
            <EmptyState>
              Components aren't ranked: they're held mid-game rather than built into a final board.
            </EmptyState>
          ) : (
            <NoStats subject={item.name} />
          )}
        </div>
        <aside className="space-y-4">
          <Section title="Effect">
            <ItemCard item={item} />
          </Section>
          {item.kind === "component" && <BuildsInto item={item} />}
          {setStats?.items[item.apiName]?.places && (
            <Section title="Placements">
              <PlacementChart places={setStats.items[item.apiName]!.places!} />
            </Section>
          )}
          {stats && (
            <Section title="Patch history">
              <PatchHistoryChart kind="items" entry={item.apiName} />
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

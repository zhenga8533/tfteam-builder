import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { ItemLink } from "@/components/game/links";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameData } from "@/lib/data/hooks";
import type { ChampionStats } from "@/lib/data/schema";
import { nextItems } from "../builds";
import { StatTable } from "./stat-table";

const MAX_ITEMS = 3;

/**
 * A build's item icons (and the name for a single item); `linked` makes each icon open its item page. Unlinked
 * labels sit inside a row's button, so their icons aren't focusable themselves.
 */
function ItemLabel({ items, linked = false }: { items: string[]; linked?: boolean }) {
  const { itemsByApi } = useGameData();
  return (
    <span className="flex items-center gap-1.5">
      {items.map((apiName, index) => {
        const item = itemsByApi.get(apiName);
        if (item && linked) return <ItemLink key={index} item={item} label={null} />;
        return item ? (
          <GameHoverCard key={index} content={<ItemCard item={item} />}>
            <span className="flex">
              <ItemIcon item={item} className="size-7" decorative={items.length === 1} />
            </span>
          </GameHoverCard>
        ) : null;
      })}
      {items.length === 1 && <span className="truncate">{itemsByApi.get(items[0]!)?.name}</span>}
    </span>
  );
}

/** Pick items one at a time and see which next item does best; plus the top builds of each size. */
function BuildFinder({ stats }: { stats: ChampionStats }) {
  const { itemsByApi } = useGameData();
  const [chosen, setChosen] = useState<string[]>([]);
  const candidates = chosen.length < MAX_ITEMS ? nextItems(stats.builds, chosen) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Holding:</span>
        {chosen.length === 0 && <span className="text-muted-foreground">nothing yet — pick a first item below</span>}
        {chosen.map((apiName, index) => {
          const item = itemsByApi.get(apiName);
          return item ? (
            <button
              key={index}
              type="button"
              onClick={() => setChosen(chosen.filter((_, i) => i !== index))}
              className="flex items-center gap-1 rounded-md border bg-card py-0.5 pr-1.5 pl-0.5 hover:border-destructive/60"
              aria-label={`Remove ${item.name}`}
            >
              <ItemIcon item={item} className="size-6" />
              <span>{item.name}</span>
              <X className="size-3.5 text-muted-foreground" />
            </button>
          ) : null;
        })}
      </div>
      {chosen.length === MAX_ITEMS ? (
        <p className="py-4 text-center text-sm text-muted-foreground">That's a full build.</p>
      ) : (
        <StatTable
          rows={candidates.map(({ item, build }) => ({
            key: item,
            label: (
              <button
                type="button"
                onClick={() => setChosen([...chosen, item])}
                className="group flex w-full items-center gap-2 text-left"
                aria-label={`Add ${itemsByApi.get(item)?.name ?? item}`}
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <ItemLabel items={[item]} />
              </button>
            ),
            line: build,
          }))}
          empty="No item has enough games alongside this build yet."
        />
      )}
    </div>
  );
}

export function ItemBuilds({ stats }: { stats: ChampionStats }) {
  const ofSize = (size: number) =>
    stats.builds
      .filter((build) => build.items.length === size)
      .map((build) => ({ key: build.items.join(","), label: <ItemLabel items={build.items} linked />, line: build }));

  return (
    <Tabs defaultValue="finder">
      <TabsList>
        <TabsTrigger value="finder">Build finder</TabsTrigger>
        <TabsTrigger value="1">Items</TabsTrigger>
        <TabsTrigger value="2">Pairs</TabsTrigger>
        <TabsTrigger value="3">Full builds</TabsTrigger>
      </TabsList>
      <TabsContent value="finder" className="pt-3">
        <BuildFinder stats={stats} />
      </TabsContent>
      {[1, 2, 3].map((size) => (
        <TabsContent key={size} value={String(size)} className="pt-3">
          <StatTable rows={ofSize(size)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

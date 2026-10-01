import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { useChampionStats, useGameData, useStats } from "@/lib/data/hooks";
import { nextItems } from "../builds";
import { percent } from "../format";
import { AvgPlacement, StatSummary } from "./stat-summary";

interface BestItemsProps {
  champion: string;
  /** Items the unit already holds; suggestions are the best item to add next. */
  equipped: string[];
  onPick: (item: string) => void;
}

const SUGGESTIONS = 6;
const MAX_ITEMS = 3;

/** The best next item for a champion given what it holds, from match stats; clicking one equips it. */
export function BestItems({ champion, equipped, onPick }: BestItemsProps) {
  const { itemsByApi } = useGameData();
  const championStats = useChampionStats(champion);
  const fallback = useStats()?.bestItems[champion];
  if (equipped.length >= MAX_ITEMS) return null;

  // Builds only cover rankable items, so components already equipped don't narrow the suggestions.
  const held = equipped.filter((apiName) => itemsByApi.get(apiName)?.kind !== "component");
  const lines = championStats
    ? nextItems(championStats.builds, held)
        .slice(0, SUGGESTIONS)
        .map(({ item, build }) => ({ ...build, item }))
    : held.length === 0
      ? fallback
      : undefined;
  if (!lines?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {held.length ? "Best next item" : "Best items"}
      </p>
      <ul className="grid grid-cols-6 gap-1.5">
        {lines.map((line) => {
          const item = itemsByApi.get(line.item);
          if (!item) return null;
          return (
            <li key={line.item}>
              <GameHoverCard
                content={
                  <div className="space-y-3">
                    <ItemCard item={item} />
                    <StatSummary line={line} className="border-t pt-3" />
                  </div>
                }
              >
                <button
                  type="button"
                  onClick={() => onPick(item.apiName)}
                  aria-label={`Equip ${item.name} (${line.avg.toFixed(2)} average placement, ${percent(line.top4)} top 4)`}
                  className="flex w-full flex-col items-center gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ItemIcon item={item} className="w-full" />
                  <AvgPlacement line={line} className="text-[11px]" />
                </button>
              </GameHoverCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useDraggable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { ChampionCard } from "@/components/game/cards";
import { TraitFilter } from "@/components/game/filters";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { DragPayload } from "../dnd";
import { useBoardSummary, useBuilder } from "../use-builder";

function PoolChampion({ champion, onBoard }: { champion: Champion; onBoard: boolean }) {
  const { add } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-champion-${champion.apiName}`,
    data: { type: "champion", apiName: champion.apiName } satisfies DragPayload,
  });

  return (
    <GameHoverCard content={<ChampionCard champion={champion} />} disabled={isDragging}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => add(champion.apiName)}
        aria-label={`Add ${champion.name}`}
        className="group flex touch-none flex-col items-center gap-1 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChampionIcon
          champion={champion}
          className={cn("w-full transition group-hover:brightness-110", onBoard && "opacity-40")}
        />
        <span className="w-full truncate text-center text-[11px] text-muted-foreground">{champion.name}</span>
      </button>
    </GameHoverCard>
  );
}

export function ChampionPool() {
  const { champions } = useGameData();
  const { units } = useBoardSummary();
  const [query, setQuery] = useState("");
  const [costs, setCosts] = useState<string[]>([]);
  const [trait, setTrait] = useState<string>();

  const onBoard = useMemo(() => new Set(units.map((unit) => unit.apiName)), [units]);
  const filtered = useMemo(() => {
    return champions.filter(
      (champion) =>
        matches(champion.name, query) &&
        (costs.length === 0 || costs.includes(String(champion.cost))) &&
        (!trait || champion.traits.includes(trait)),
    );
  }, [champions, query, costs, trait]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search champions" />
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={costs}
          onValueChange={setCosts}
          aria-label="Filter by cost"
        >
          {COSTS.map((cost) => (
            <ToggleGroupItem key={cost} value={String(cost)} className={cn("w-9 font-semibold", COST_TEXT[cost])}>
              {cost}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <TraitFilter value={trait} onChange={setTrait} />
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No champions match these filters.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-1">
          {filtered.map((champion) => (
            <PoolChampion key={champion.apiName} champion={champion} onBoard={onBoard.has(champion.apiName)} />
          ))}
        </div>
      )}
    </div>
  );
}

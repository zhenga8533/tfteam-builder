import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ChampionCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { Champion } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import type { DragPayload } from "../dnd";
import { useBoardSummary, useBuilder } from "../use-builder";

const ALL_TRAITS = "all";

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
  const { champions, traits } = useGameData();
  const { units } = useBoardSummary();
  const [query, setQuery] = useState("");
  const [costs, setCosts] = useState<string[]>([]);
  const [trait, setTrait] = useState(ALL_TRAITS);

  const onBoard = useMemo(() => new Set(units.map((unit) => unit.apiName)), [units]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return champions.filter(
      (champion) =>
        (!needle || champion.name.toLowerCase().includes(needle)) &&
        (costs.length === 0 || costs.includes(String(champion.cost))) &&
        (trait === ALL_TRAITS || champion.traits.includes(trait)),
    );
  }, [champions, query, costs, trait]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search champions"
            className="pl-8"
            aria-label="Search champions"
          />
        </div>
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
        <Select value={trait} onValueChange={setTrait}>
          <SelectTrigger className="w-40" aria-label="Filter by trait">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TRAITS}>All traits</SelectItem>
            {traits.map((option) => (
              <SelectItem key={option.apiName} value={option.apiName}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

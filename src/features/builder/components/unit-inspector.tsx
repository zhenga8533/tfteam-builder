import { MousePointerClick, Star, Trash2, X } from "lucide-react";
import { Suspense, useMemo } from "react";
import { ChampionAbility, ChampionStats, ChampionTraitList } from "@/components/game/cards";
import { ChampionIcon, ItemIcon } from "@/components/game/icons";
import { COST_TEXT } from "@/components/game/styles";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import { createResolver } from "@/lib/game/description";
import { cn } from "@/lib/utils";
import { MAX_ITEMS, STAR_LEVELS, type StarLevel } from "@/lib/game/board";
import { BestItems } from "@/features/stats/components/best-items";
import { useBuilder } from "../use-builder";
import { FlexControls } from "./flex-controls";

export function UnitInspector({ className }: { className?: string }) {
  const { championsByApi, itemsByApi } = useGameData();
  const { board, selected, select, remove, setStar, unequip, equip, equipAll } = useBuilder();
  const unit = selected === null ? null : board[selected];
  const champion = unit ? championsByApi.get(unit.apiName) : undefined;
  const resolve = useMemo(() => createResolver(champion?.ability.variables ?? {}), [champion]);

  if (selected === null || !unit || !champion) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <MousePointerClick className="size-6" />
        <p>Select a unit on the board to set its star level and items.</p>
        <p className="text-xs">Drag to move · Right-click or drag off to remove</p>
      </div>
    );
  }

  return (
    <section
      className={cn("space-y-4 rounded-xl border bg-card p-4", className)}
      aria-label={`${champion.name} details`}
    >
      <div className="flex items-start gap-3">
        <ChampionIcon champion={champion} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">{champion.name}</p>
          <p className={cn("text-xs", COST_TEXT[champion.cost])}>{champion.cost} cost</p>
        </div>
        <Button variant="ghost" size="icon" className="-mt-1 -mr-2" onClick={() => select(null)} aria-label="Close">
          <X />
        </Button>
      </div>

      <ChampionTraitList champion={champion} />

      <ToggleGroup
        type="single"
        variant="outline"
        value={String(unit.star)}
        onValueChange={(value) => value && setStar(selected, Number(value) as StarLevel)}
        className="w-full"
        aria-label="Star level"
      >
        {STAR_LEVELS.map((star) => (
          <ToggleGroupItem key={star} value={String(star)} className="flex-1 gap-0.5">
            {Array.from({ length: star }, (_, i) => (
              <Star key={i} className="size-3.5 fill-current" />
            ))}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <FlexControls unit={unit} index={selected} />

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Items {unit.items.length}/{MAX_ITEMS}
        </p>
        {unit.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Drag items onto the unit, or click one while it's selected.</p>
        ) : (
          <ul className="space-y-1">
            {unit.items.map((apiName, itemIndex) => {
              const item = itemsByApi.get(apiName);
              if (!item) return null;
              return (
                <li key={itemIndex} className="flex items-center gap-2 rounded-md bg-muted/50 p-1 pr-0">
                  <ItemIcon item={item} className="size-7" />
                  <span className="flex-1 truncate text-sm">{item.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => unequip(selected, itemIndex)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Champion stats load on first selection; keep the wait local instead of suspending the page. */}
      <Suspense fallback={<Skeleton className="h-16" />}>
        <BestItems
          champion={champion.apiName}
          equipped={unit.items}
          onPick={(item) => equip(selected, item)}
          onPickBuild={(items) => equipAll(selected, items)}
        />
      </Suspense>

      <ChampionAbility champion={champion} resolve={resolve} star={unit.star} />

      <ChampionStats champion={champion} className="border-t pt-3" />

      <Button variant="outline" size="sm" className="w-full" onClick={() => remove(selected)}>
        <Trash2 /> Remove from board
      </Button>
    </section>
  );
}

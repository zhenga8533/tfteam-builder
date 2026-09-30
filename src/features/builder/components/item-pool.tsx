import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { ITEM_KIND_LABELS } from "@/components/game/styles";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGameData } from "@/lib/data/hooks";
import type { Item, ItemKind } from "@/lib/data/schema";
import type { DragPayload } from "../dnd";
import { useBuilder } from "../use-builder";

function PoolItem({ item }: { item: Item }) {
  const { equipAnywhere } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-item-${item.apiName}`,
    data: { type: "item", apiName: item.apiName } satisfies DragPayload,
  });

  return (
    <GameHoverCard content={<ItemCard item={item} />} disabled={isDragging}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => equipAnywhere(item.apiName)}
        aria-label={`Equip ${item.name}`}
        className="touch-none rounded-sm transition outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ItemIcon item={item} className="w-full" />
      </button>
    </GameHoverCard>
  );
}

export function ItemPool() {
  const { items } = useGameData();
  const [kind, setKind] = useState<ItemKind>("completed");
  const kinds = (Object.keys(ITEM_KIND_LABELS) as ItemKind[]).filter((option) =>
    items.some((item) => item.kind === option),
  );

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        variant="outline"
        value={kind}
        onValueChange={(value) => value && setKind(value as ItemKind)}
        className="flex-wrap"
        aria-label="Item category"
      >
        {kinds.map((option) => (
          <ToggleGroupItem key={option} value={option} className="px-3">
            {ITEM_KIND_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
        {items
          .filter((item) => item.kind === kind)
          .map((item) => (
            <PoolItem key={item.apiName} item={item} />
          ))}
      </div>
    </div>
  );
}

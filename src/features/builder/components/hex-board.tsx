import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChampionCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { EmptyHex, HexGrid, HexUnit } from "@/components/game/hex-grid";
import { useGameData } from "@/lib/data/hooks";
import type { BoardUnit } from "@/lib/game/board";
import { cn } from "@/lib/utils";
import { type DragPayload, type DropPayload, hexDropId, unitDragId } from "../dnd";
import { useBuilder } from "../use-builder";

function PlacedUnit({ unit, index }: { unit: BoardUnit; index: number }) {
  const { championsByApi, itemsByApi } = useGameData();
  const { selected, select, remove } = useBuilder();
  const champion = championsByApi.get(unit.apiName);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: unitDragId(index),
    data: { type: "unit", index } satisfies DragPayload,
  });

  if (!champion) return null;

  return (
    <GameHoverCard
      content={<ChampionCard champion={champion} star={unit.star} />}
      side="right"
      disabled={isDragging || selected === index}
    >
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => select(selected === index ? null : index)}
        onContextMenu={(event) => {
          event.preventDefault();
          remove(index);
        }}
        aria-label={`${champion.name}, ${unit.star} star${unit.flex ? ", flex" : ""}. Right-click to remove.`}
        className={cn("absolute inset-0 touch-none outline-none", isDragging && "opacity-30")}
      >
        <HexUnit
          champion={champion}
          star={unit.star}
          items={unit.items.flatMap((apiName) => itemsByApi.get(apiName) ?? [])}
          highlighted={selected === index}
          flex={unit.flex}
          alternatives={unit.alternatives?.flatMap((apiName) => championsByApi.get(apiName) ?? [])}
        />
      </button>
    </GameHoverCard>
  );
}

function HexCell({ index }: { index: number }) {
  const { board } = useBuilder();
  const unit = board[index];
  const { setNodeRef, isOver, active } = useDroppable({
    id: hexDropId(index),
    data: { type: "hex", index } satisfies DropPayload,
  });
  const draggingItem = (active?.data.current as DragPayload | undefined)?.type === "item";

  return (
    <div ref={setNodeRef} className="hex-cell">
      <EmptyHex className={cn(isOver && (draggingItem && !unit ? "bg-destructive/30" : "bg-primary/40"))} />
      {unit && <PlacedUnit unit={unit} index={index} />}
    </div>
  );
}

export function HexBoard() {
  return <HexGrid className="max-w-2xl" renderCell={(index) => <HexCell key={index} index={index} />} />;
}

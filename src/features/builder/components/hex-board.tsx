import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Star } from "lucide-react";
import { ChampionCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { COST_BG } from "@/components/game/styles";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { BOARD_COLS, BOARD_ROWS, type BoardUnit } from "../board";
import { type DragPayload, type DropPayload, hexDropId, unitDragId } from "../dnd";
import { useBuilder } from "../use-builder";

const STAR_COLORS: Record<number, string> = { 1: "text-cost-1", 2: "text-trait-silver", 3: "text-trait-gold" };

function UnitStars({ star }: { star: number }) {
  if (star === 1) return null;
  return (
    <span className="absolute -top-1 left-1/2 z-10 flex -translate-x-1/2" aria-label={`${star} star`}>
      {Array.from({ length: star }, (_, i) => (
        <Star key={i} className={cn("size-3 fill-current drop-shadow", STAR_COLORS[star])} />
      ))}
    </span>
  );
}

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
        aria-label={`${champion.name}, ${unit.star} star. Right-click to remove.`}
        className={cn("absolute inset-0 touch-none outline-none", isDragging && "opacity-30")}
      >
        <span
          className={cn("hex-clip absolute inset-0 p-[5%]", COST_BG[champion.cost], selected === index && "bg-primary")}
        >
          <img
            src={champion.icon}
            alt=""
            draggable={false}
            className="hex-clip size-full bg-muted object-cover select-none"
          />
        </span>
        <UnitStars star={unit.star} />
        {unit.items.length > 0 && (
          <span className="absolute inset-x-0 bottom-[6%] flex justify-center gap-px">
            {unit.items.map((apiName, itemIndex) => {
              const item = itemsByApi.get(apiName);
              return item ? (
                <ItemIcon key={itemIndex} item={item} className="w-[26%] rounded-[2px] ring-1 ring-black/60" />
              ) : null;
            })}
          </span>
        )}
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
      <div
        className={cn(
          "hex-clip absolute inset-0 bg-secondary/70 transition-colors",
          isOver && (draggingItem && !unit ? "bg-destructive/30" : "bg-primary/40"),
        )}
      />
      {unit && <PlacedUnit unit={unit} index={index} />}
    </div>
  );
}

export function HexBoard() {
  return (
    <div className="hex-board mx-auto w-full max-w-2xl select-none" role="grid" aria-label="Board">
      {Array.from({ length: BOARD_ROWS }, (_, row) => (
        <div key={row} className="hex-row" role="row">
          {Array.from({ length: BOARD_COLS }, (_, col) => (
            <HexCell key={col} index={row * BOARD_COLS + col} />
          ))}
        </div>
      ))}
    </div>
  );
}

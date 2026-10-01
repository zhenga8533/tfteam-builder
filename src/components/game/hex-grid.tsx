import { Star } from "lucide-react";
import type { ReactNode } from "react";
import type { Champion, Item } from "@/lib/data/schema";
import { BOARD_COLS, BOARD_ROWS } from "@/lib/game/board";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./icons";
import { COST_BG } from "./styles";

interface HexGridProps {
  renderCell: (index: number) => ReactNode;
  className?: string;
  label?: string;
}

/** Lays out the 4×7 honeycomb; each cell's content comes from `renderCell`. */
export function HexGrid({ renderCell, className, label = "Board" }: HexGridProps) {
  return (
    <div className={cn("hex-board mx-auto w-full select-none", className)} role="grid" aria-label={label}>
      {Array.from({ length: BOARD_ROWS }, (_, row) => (
        <div key={row} className="hex-row" role="row">
          {Array.from({ length: BOARD_COLS }, (_, col) => renderCell(row * BOARD_COLS + col))}
        </div>
      ))}
    </div>
  );
}

export function EmptyHex({ className }: { className?: string }) {
  return <div className={cn("hex-clip absolute inset-0 bg-secondary/70 transition-colors", className)} />;
}

const STAR_COLORS: Record<number, string> = { 2: "text-trait-silver", 3: "text-trait-gold" };

interface HexUnitProps {
  champion: Champion;
  star: number;
  items: Item[];
  highlighted?: boolean;
  /** An optional slot: drawn faded with a "Flex" tag. */
  flex?: boolean;
  /** Champions that can stand in for this one, shown as small portraits. */
  alternatives?: Champion[];
}

const SHOWN_ALTERNATIVES = 2;

/** The visual for a unit on a hex: cost-colored frame, portrait, star pips, items, flex tag and alternatives. */
export function HexUnit({ champion, star, items, highlighted, flex, alternatives = [] }: HexUnitProps) {
  const hidden = alternatives.length - SHOWN_ALTERNATIVES;
  return (
    <>
      <span
        className={cn(
          "hex-clip absolute inset-0 p-[5%]",
          highlighted ? "bg-primary" : COST_BG[champion.cost],
          flex && "opacity-50 saturate-50",
        )}
      >
        <img
          src={champion.icon}
          alt=""
          draggable={false}
          className="hex-clip size-full bg-muted object-cover select-none"
        />
      </span>
      {flex && (
        <span className="absolute top-[22%] left-1/2 z-10 -translate-x-1/2 rounded-sm bg-background/90 px-1 text-[9px] leading-tight font-bold tracking-wide text-muted-foreground uppercase ring-1 ring-border">
          Flex
        </span>
      )}
      {alternatives.length > 0 && (
        <span
          className="absolute top-[18%] -right-[6%] z-10 flex flex-col items-center gap-px"
          aria-label={`Or ${alternatives.map((alternative) => alternative.name).join(", ")}`}
        >
          {alternatives.slice(0, SHOWN_ALTERNATIVES).map((alternative) => (
            <img
              key={alternative.apiName}
              src={alternative.icon}
              alt=""
              draggable={false}
              className={cn("size-[1.1rem] rounded-full object-cover ring-1 ring-black/70", COST_BG[alternative.cost])}
            />
          ))}
          {hidden > 0 && (
            <span className="rounded-full bg-background/90 px-1 text-[9px] leading-tight font-semibold">+{hidden}</span>
          )}
        </span>
      )}
      {star > 1 && (
        <span className="absolute -top-1 left-1/2 z-10 flex -translate-x-1/2" aria-label={`${star} star`}>
          {Array.from({ length: star }, (_, i) => (
            <Star key={i} className={cn("size-3 fill-current drop-shadow", STAR_COLORS[star])} />
          ))}
        </span>
      )}
      {items.length > 0 && (
        <span className="absolute inset-x-0 bottom-[6%] flex justify-center gap-px">
          {items.map((item, index) => (
            <ItemIcon key={index} item={item} className="w-[26%] rounded-[2px] ring-1 ring-black/60" />
          ))}
        </span>
      )}
    </>
  );
}

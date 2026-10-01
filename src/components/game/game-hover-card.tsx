import { Slot } from "radix-ui";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

interface HoverCardTarget {
  element: HTMLElement;
  content: ReactNode;
  side: Side;
}

const OPEN_DELAY = 250;
const CLOSE_DELAY = 100;
const GAP = 8;
const MARGIN = 8;

let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * One hover card for the whole page. Pages show hundreds of champion, item and trait icons, so instead of
 * a hover card per icon, each icon asks this store to show its content next to it. Icons are never
 * re-rendered to open a card, so clicks and drags on them aren't interrupted.
 */
const useHoverCard = create<{ target: HoverCardTarget | null }>(() => ({ target: null }));

const show = (target: HoverCardTarget) => {
  clearTimeout(closeTimer);
  useHoverCard.setState({ target });
};
const scheduleShow = (target: HoverCardTarget) => {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  openTimer = setTimeout(() => show(target), OPEN_DELAY);
};
const scheduleHide = () => {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => useHoverCard.setState({ target: null }), CLOSE_DELAY);
};
const cancelHide = () => clearTimeout(closeTimer);

interface GameHoverCardProps {
  children: ReactNode;
  content: ReactNode;
  side?: Side;
  disabled?: boolean;
}

/** Shows a champion/item/trait card when `children` is hovered with a mouse or focused with the keyboard. */
export function GameHoverCard({ children, content, side = "top", disabled }: GameHoverCardProps) {
  if (disabled) return children;
  return (
    <Slot.Root
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") scheduleShow({ element: event.currentTarget, content, side });
      }}
      onPointerLeave={scheduleHide}
      onPointerDown={() => clearTimeout(openTimer)}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) show({ element: event.currentTarget, content, side });
      }}
      onBlur={scheduleHide}
    >
      {children}
    </Slot.Root>
  );
}

/** Places the card on `side` of the anchor, flipping when it doesn't fit and keeping it on screen. */
function position(card: DOMRect, anchor: DOMRect, side: Side) {
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), innerWidth - card.width - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, MARGIN), innerHeight - card.height - MARGIN);
  if (side === "left" || side === "right") {
    const right = anchor.right + GAP;
    const left = anchor.left - card.width - GAP;
    const fitsRight = right + card.width <= innerWidth - MARGIN;
    const fitsLeft = left >= MARGIN;
    const x = side === "right" ? (fitsRight || !fitsLeft ? right : left) : fitsLeft || !fitsRight ? left : right;
    return { x: clampX(x), y: clampY(anchor.top + anchor.height / 2 - card.height / 2) };
  }
  const above = anchor.top - card.height - GAP;
  const below = anchor.bottom + GAP;
  const fitsAbove = above >= MARGIN;
  const fitsBelow = below + card.height <= innerHeight - MARGIN;
  const y = side === "top" ? (fitsAbove || !fitsBelow ? above : below) : fitsBelow || !fitsAbove ? below : above;
  return { x: clampX(anchor.left + anchor.width / 2 - card.width / 2), y: Math.max(y, MARGIN) };
}

/** Renders the page's hover card; mounted once in the root layout. */
export function GameHoverCardHost() {
  const target = useHoverCard((state) => state.target);
  const card = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ target: HoverCardTarget; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!target || !card.current) return;
    if (!target.element.isConnected) {
      useHoverCard.setState({ target: null });
      return;
    }
    const { x, y } = position(
      card.current.getBoundingClientRect(),
      target.element.getBoundingClientRect(),
      target.side,
    );
    setPlaced({ target, x, y });
    // Once the page moves, the card no longer points at its icon.
    const close = () => useHoverCard.setState({ target: null });
    addEventListener("scroll", close, { capture: true, passive: true });
    addEventListener("resize", close);
    return () => {
      removeEventListener("scroll", close, { capture: true });
      removeEventListener("resize", close);
    };
  }, [target]);

  if (!target) return null;
  const coordinates = placed?.target === target ? placed : null;
  return createPortal(
    <div
      ref={card}
      role="tooltip"
      onPointerEnter={cancelHide}
      onPointerLeave={scheduleHide}
      style={{ left: coordinates?.x ?? 0, top: coordinates?.y ?? 0 }}
      className={cn(
        "fixed z-50 w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-md",
        coordinates ? "animate-in fade-in-0 zoom-in-95" : "invisible",
      )}
    >
      {target.content}
    </div>,
    document.body,
  );
}

import { Slot } from "radix-ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface GameHoverCardProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}

const OPEN_DELAY = 250;

/**
 * A champion/item/trait card shown on hover or focus. Pages can show hundreds of icons, so the hover
 * card itself is only mounted once an icon is actually hovered or focused; until then it's a bare trigger.
 */
export function GameHoverCard({ children, content, side = "top", disabled }: GameHoverCardProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (disabled) return children;

  if (!mounted) {
    const show = () => {
      setMounted(true);
      setOpen(true);
    };
    return (
      <Slot.Root
        onPointerEnter={() => {
          timer.current = setTimeout(show, OPEN_DELAY);
        }}
        onPointerLeave={() => clearTimeout(timer.current)}
        onFocus={show}
      >
        {children}
      </Slot.Root>
    );
  }

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={OPEN_DELAY} closeDelay={50}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} className="w-80">
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

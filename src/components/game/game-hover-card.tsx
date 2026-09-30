import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface GameHoverCardProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}

export function GameHoverCard({ children, content, side = "top", disabled }: GameHoverCardProps) {
  if (disabled) return children;
  return (
    <HoverCard openDelay={250} closeDelay={50}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} className="w-80">
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

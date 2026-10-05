import { Swords } from "lucide-react";

/** Marks a comp's carry without covering its cost ring; the same icon as the carry filter. */
export function CarryBadge() {
  return (
    <span
      role="img"
      aria-label="Carry"
      title="Carry"
      className="grid size-4.5 place-items-center rounded-full bg-foreground text-background ring-2 ring-card"
    >
      <Swords className="size-2.5" />
    </span>
  );
}

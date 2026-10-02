import { cn } from "@/lib/utils";
import { percent } from "../format";

/** Bar colours, 1st to 8th: gold for wins, green for the rest of the top 4, muted below, red for 8th. */
const BAR = [
  "bg-trait-gold",
  "bg-cost-2",
  "bg-cost-2",
  "bg-cost-2",
  "bg-muted-foreground/40",
  "bg-muted-foreground/40",
  "bg-muted-foreground/40",
  "bg-destructive/60",
];

/**
 * How often games ended at each placement, 1st to 8th. An average hides whether something is steady
 * (mostly 3rd–4th) or swingy (wins or busts); the shape shows it.
 */
export function PlacementChart({ places, className }: { places: number[]; className?: string }) {
  const games = places.reduce((total, count) => total + count, 0);
  if (games === 0) return null;
  const highest = Math.max(...places);
  return (
    <figure className={cn("space-y-1", className)}>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Games by placement, 1st to 8th">
        {places.map((count, index) => (
          <div
            key={index}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${index + 1}${ordinal(index + 1)}: ${percent(count / games)} (${count} games)`}
          >
            <div className={cn("w-full rounded-t-sm", BAR[index])} style={{ height: `${(count / highest) * 100}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="flex gap-1.5 text-center text-[11px] text-muted-foreground tabular-nums">
        {places.map((count, index) => (
          <span key={index} className="flex-1">
            <span className="block font-medium text-foreground">{index + 1}</span>
            {percent(count / games)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

const ordinal = (place: number) => (place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th");

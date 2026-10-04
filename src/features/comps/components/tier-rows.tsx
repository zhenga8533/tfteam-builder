import { type ReactNode, useId } from "react";
import { type Tier, TIERS } from "@/content/types";
import { cn } from "@/lib/utils";
import { TIER_BORDER } from "../styles";
import { TierBadge } from "./tier-badge";

interface TierRowsProps<T> {
  rows: Partial<Record<Tier, T[]>>;
  renderRow: (entries: T[], tier: Tier) => ReactNode;
}

/** One row per non-empty tier, S first, with the tier letter on the left. */
export function TierRows<T>({ rows, renderRow }: TierRowsProps<T>) {
  const id = useId();
  return (
    <div className="space-y-3">
      {TIERS.map((tier) => {
        const entries = rows[tier];
        if (!entries?.length) return null;
        return (
          <section
            key={tier}
            aria-labelledby={`${id}-${tier}`}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-card/60 p-3 sm:flex-row sm:gap-4",
              TIER_BORDER[tier],
            )}
          >
            {/* Gives each tier a heading, so screen readers can jump between tiers. */}
            <h2 id={`${id}-${tier}`} className="sr-only">
              {tier} tier
            </h2>
            <span aria-hidden>
              <TierBadge tier={tier} className="sm:size-12 sm:text-2xl" />
            </span>
            <div className="min-w-0 flex-1">{renderRow(entries, tier)}</div>
          </section>
        );
      })}
    </div>
  );
}

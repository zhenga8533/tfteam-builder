import type { ReactNode } from "react";
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
  return (
    <div className="space-y-3">
      {TIERS.map((tier) => {
        const entries = rows[tier];
        if (!entries?.length) return null;
        return (
          <section
            key={tier}
            aria-label={`${tier} tier`}
            // Off-screen rows skip rendering work until scrolled near; long tier lists stay responsive.
            className={cn(
              "flex gap-3 rounded-xl border bg-card/60 p-3 [contain-intrinsic-size:auto_12rem] [content-visibility:auto] sm:gap-4",
              TIER_BORDER[tier],
            )}
          >
            <TierBadge tier={tier} className="sm:size-12 sm:text-2xl" />
            <div className="min-w-0 flex-1">{renderRow(entries, tier)}</div>
          </section>
        );
      })}
    </div>
  );
}

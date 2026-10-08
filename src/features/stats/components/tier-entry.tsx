import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GameHoverCard } from "@/components/game/game-hover-card";
import type { StatLine } from "@/lib/data/schema";
import { AvgPlacement, StatSummary } from "./stat-summary";

interface TierEntryProps {
  icon: ReactNode;
  label: string;
  line: StatLine | undefined;
  card: ReactNode;
  /** Makes the entry a link, e.g. to the champion's stats page. */
  link?: Pick<LinkProps, "to" | "params">;
  /** Movement since the previous patch, e.g. a `StatTrend`. */
  trend?: ReactNode;
  /** Shows the play rate in the hover card, with this wording (see `StatSummary`). */
  play?: string;
}

/** A trend badge as a chip on an icon's corner; hidden when the badge has nothing to show. */
export const TREND_CHIP =
  "absolute -top-1.5 -right-2 flex rounded-full bg-background px-1 shadow-xs ring-1 ring-border empty:hidden";

const ENTRY_CLASS =
  "flex w-16 flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Icon, name and average placement, with the full game card (plus stats) on hover. The trend sits on the icon's corner,
 * so entries with and without one are the same size.
 */
export function TierEntry({ icon, label, line, card, link, trend, play }: TierEntryProps) {
  const content = (
    <>
      <span className="relative">
        {icon}
        {trend && <span className={TREND_CHIP}>{trend}</span>}
      </span>
      <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">{label}</span>
      {line && <AvgPlacement line={line} className="text-xs" />}
    </>
  );

  return (
    <GameHoverCard
      content={
        <div className="space-y-3">
          {card}
          {line && <StatSummary line={line} className="border-t pt-3" play={play} />}
        </div>
      }
    >
      {link ? (
        <Link {...link} className={ENTRY_CLASS}>
          {content}
        </Link>
      ) : (
        <span tabIndex={0} className={ENTRY_CLASS}>
          {content}
        </span>
      )}
    </GameHoverCard>
  );
}

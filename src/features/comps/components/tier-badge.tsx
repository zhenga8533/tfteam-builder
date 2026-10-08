import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import type { Tier, Trend } from "@/content/types";
import { cn } from "@/lib/utils";
import { TIER_BG } from "../styles";

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-xl font-bold text-black/80",
        TIER_BG[tier],
        className,
      )}
      aria-label={`${tier} tier`}
    >
      {tier}
    </span>
  );
}

const TRENDS = {
  up: { icon: ArrowUp, label: "Rising", className: "text-cost-2 bg-cost-2/10" },
  down: { icon: ArrowDown, label: "Falling", className: "text-destructive bg-destructive/10" },
  new: { icon: Sparkles, label: "New", className: "text-primary bg-primary/10" },
} as const;

export function GuideTrendBadge({ trend }: { trend: Trend }) {
  const { icon: Icon, label, className } = TRENDS[trend];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

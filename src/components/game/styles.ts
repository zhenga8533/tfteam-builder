import type { AugmentTier, ItemKind } from "@/lib/data/schema";
import type { TraitStyle } from "@/lib/game/traits";
import type { TextStyle } from "@/lib/game/description";

export const COSTS = [1, 2, 3, 4, 5] as const;

export const COST_RING: Record<number, string> = {
  1: "ring-cost-1",
  2: "ring-cost-2",
  3: "ring-cost-3",
  4: "ring-cost-4",
  5: "ring-cost-5",
};

export const COST_TEXT: Record<number, string> = {
  1: "text-cost-1",
  2: "text-cost-2",
  3: "text-cost-3",
  4: "text-cost-4",
  5: "text-cost-5",
};

export const COST_BG: Record<number, string> = {
  1: "bg-cost-1",
  2: "bg-cost-2",
  3: "bg-cost-3",
  4: "bg-cost-4",
  5: "bg-cost-5",
};

export const TRAIT_TEXT: Record<TraitStyle, string> = {
  inactive: "text-muted-foreground",
  bronze: "text-trait-bronze",
  silver: "text-trait-silver",
  gold: "text-trait-gold",
  prismatic: "text-trait-prismatic",
  unique: "text-trait-unique",
};

export const TEXT_STYLE_CLASS: Record<TextStyle, string> = {
  magic: "text-sky-300",
  physical: "text-orange-300",
  true: "text-foreground font-semibold",
  keyword: "text-primary font-medium",
  bonus: "text-emerald-300",
  muted: "text-muted-foreground italic",
};

export const AUGMENT_TIER_LABEL = { 1: "Silver", 2: "Gold", 3: "Prismatic" } as const;

export const AUGMENT_TIER_TEXT = { 1: "text-trait-silver", 2: "text-trait-gold", 3: "text-trait-prismatic" } as const;

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  completed: "Completed",
  emblem: "Emblems",
  artifact: "Artifacts",
  radiant: "Radiant",
  component: "Components",
  set: "Set items",
};

export const AUGMENT_TIERS = [1, 2, 3] as const satisfies AugmentTier[];

export const isAugmentTier = (value: number | undefined): value is AugmentTier =>
  AUGMENT_TIERS.includes(value as AugmentTier);

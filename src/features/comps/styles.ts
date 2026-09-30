import type { Difficulty, Tier } from "@/content/types";

export const TIER_BG: Record<Tier, string> = {
  S: "bg-tier-s",
  A: "bg-tier-a",
  B: "bg-tier-b",
  C: "bg-tier-c",
  X: "bg-tier-x",
};

export const TIER_BORDER: Record<Tier, string> = {
  S: "border-tier-s/40",
  A: "border-tier-a/40",
  B: "border-tier-b/40",
  C: "border-tier-c/40",
  X: "border-tier-x/40",
};

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  Easy: "text-cost-2",
  Medium: "text-tier-b",
  Hard: "text-tier-s",
};

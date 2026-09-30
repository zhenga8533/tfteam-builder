import type { StarLevel } from "@/lib/game/board";

export const TIERS = ["S", "A", "B", "C", "X"] as const;
export type Tier = (typeof TIERS)[number];

export const PLAYSTYLES = ["Fast 8", "Fast 9", "Slow Roll", "Reroll", "Flex"] as const;
export type Playstyle = (typeof PLAYSTYLES)[number];

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Trend = "up" | "down" | "new";

export interface CompUnit {
  /** Champion apiName from the set data. */
  apiName: string;
  /** Board hex, 0–27, row-major from the top-left (row 0 is the front line). */
  hex: number;
  star?: StarLevel;
  /** Item apiNames, at most three. */
  items?: string[];
  /** Highlights the unit as a carry on comp cards. */
  carry?: boolean;
}

export interface Comp {
  /** URL slug; must be unique across all sets. */
  slug: string;
  name: string;
  set: number;
  tier: Tier;
  trend?: Trend;
  playstyle: Playstyle;
  difficulty: Difficulty;
  summary: string;
  /** The level 8–9 capped board. */
  board: CompUnit[];
  /** Optional early-game board. */
  early?: CompUnit[];
  /** Recommended augment apiNames, strongest first. */
  augments?: string[];
  tips?: string[];
  /** ISO date (YYYY-MM-DD) of the last content update. */
  updatedAt: string;
}

export type TierRows = Partial<Record<Tier, string[]>>;

export interface TierList {
  set: number;
  /** Item apiNames grouped by tier. */
  items: TierRows;
  /** Augment apiNames grouped by tier. */
  augments: TierRows;
  updatedAt: string;
}

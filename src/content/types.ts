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
  /** An optional slot; its traits are counted separately in the Team Builder. */
  flex?: boolean;
  /** Champion apiNames that can stand in for this unit. */
  alternatives?: string[];
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

/** Champion apiNames, item apiNames and trait breakpoints (`apiName:minUnits`, e.g. `"DA_18_Blossom:5"`). */
export interface StatTierRows {
  champions?: TierRows;
  items?: TierRows;
  traits?: TierRows;
}

/**
 * Champion, item and trait tiers are generated from match stats. Augments aren't in match data, so their
 * tier list is fully hand-written.
 */
export interface TierList extends StatTierRows {
  set: number;
  /**
   * Hand-written tier lists shown only while a set has no match stats (before crawling starts, or on PBE).
   * Once stats exist they're ignored, unlike the overrides (`champions`, `items`, `traits`), which always
   * move an entry to their tier and are marked as placed by hand.
   */
  fallback?: StatTierRows;
  /** Augment apiNames grouped by tier. */
  augments: TierRows;
  updatedAt: string;
}

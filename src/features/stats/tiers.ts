import { type Tier, type TierRows, TIERS } from "@/content/types";

export interface Ranked {
  key: string;
  tier?: Tier;
}

/**
 * Combines generated tiers with hand-written overrides: an overridden entry moves to its manual
 * tier (listed first, in authored order); everything else keeps its generated tier and order.
 */
export function mergeTiers(generated: Ranked[], overrides: TierRows = {}): TierRows {
  const overridden = new Set(Object.values(overrides).flat());
  const rows: TierRows = {};
  for (const tier of TIERS) {
    const entries = [
      ...(overrides[tier] ?? []),
      ...generated.filter((entry) => entry.tier === tier && !overridden.has(entry.key)).map((entry) => entry.key),
    ];
    if (entries.length) rows[tier] = entries;
  }
  return rows;
}

interface TierListRowsOptions {
  /** Entries with stats, best first; may be narrowed by filters. */
  generated: Ranked[];
  /** Whether the set has stats at all, before any filtering. */
  hasStats: boolean;
  overrides?: TierRows;
  fallback?: TierRows;
}

/**
 * The rows a stats tier list shows. With stats, generated tiers plus the overrides, which are reported as
 * `pinned`. Without stats, the hand-written fallback instead: it stands in for stats and never mixes with them.
 */
export function tierListRows({ generated, hasStats, overrides = {}, fallback = {} }: TierListRowsOptions) {
  if (!hasStats) return { rows: fallback, pinned: new Set<string>(), usingFallback: Object.keys(fallback).length > 0 };
  return {
    rows: mergeTiers(generated, overrides),
    pinned: new Set(Object.values(overrides).flat()),
    usingFallback: false,
  };
}

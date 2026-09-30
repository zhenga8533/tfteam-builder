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

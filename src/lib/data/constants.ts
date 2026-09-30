export const PATCHES = ["latest", "pbe"] as const;

export const ITEM_KINDS = ["component", "completed", "emblem", "radiant", "artifact"] as const;

/** Rank floors stats can be computed at, highest first. */
export const RANK_FLOORS = ["diamond", "emerald", "platinum", "gold"] as const;

/** Tiers assigned from stats; the hand-written `X` tier is never automatic. */
export const STAT_TIERS = ["S", "A", "B", "C"] as const;

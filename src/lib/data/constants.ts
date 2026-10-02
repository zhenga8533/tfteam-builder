export const PATCHES = ["latest", "pbe"] as const;

export const ITEM_KINDS = ["component", "completed", "emblem", "radiant", "artifact"] as const;

/** Rank floors stats can be computed at, highest first. */
/** Rank floors the stats fall back through, highest first, until one has enough games. */
export const RANK_FLOORS = ["diamond", "emerald", "platinum", "gold"] as const;
/** Every floor stats can be shown for; Master+ is only offered as a choice, never as the fallback. */
export const RANK_OPTIONS = ["master", ...RANK_FLOORS] as const;

export const isRankFloor = (value: unknown): value is (typeof RANK_OPTIONS)[number] =>
  RANK_OPTIONS.includes(value as (typeof RANK_OPTIONS)[number]);

/** Tiers assigned from stats; the hand-written `X` tier is never automatic. */
export const STAT_TIERS = ["S", "A", "B", "C"] as const;

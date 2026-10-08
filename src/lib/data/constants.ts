export const PATCHES = ["latest", "pbe"] as const;

export const ITEM_KINDS = ["component", "completed", "emblem", "radiant", "artifact", "set"] as const;

/** Rank floors stats can be computed at, highest first. */
/** Rank floors the stats fall back through, highest first, until one has enough games. */
export const RANK_FLOORS = ["diamond", "emerald", "platinum", "gold"] as const;
/** Every floor stats can be shown for; Master+ is only offered as a choice, never as the fallback. */
export const RANK_OPTIONS = ["master", ...RANK_FLOORS] as const;

/** Crawls run every few hours; stats older than this mean crawling has stopped (e.g. an expired API key). */
export const STALE_STATS_HOURS = 24;

/** Players in a standard ranked match, each with a board of their own. */
export const BOARDS_PER_MATCH = 8;

export const isStale = (updatedAt: string, now = Date.now()) =>
  now - Date.parse(updatedAt) > STALE_STATS_HOURS * 3_600_000;

/** Riot's routing regions; match data is fetched per region, so boards are stored per region too. */
export const REGIONS = ["americas", "europe", "asia", "sea"] as const;
export type Region = (typeof REGIONS)[number];

export const isRegion = (value: unknown): value is Region => REGIONS.includes(value as Region);

export const isItemKind = (value: unknown): value is (typeof ITEM_KINDS)[number] =>
  ITEM_KINDS.includes(value as (typeof ITEM_KINDS)[number]);

export const isRankFloor = (value: unknown): value is (typeof RANK_OPTIONS)[number] =>
  RANK_OPTIONS.includes(value as (typeof RANK_OPTIONS)[number]);

/** Tiers assigned from stats; the hand-written `X` tier is never automatic. */
export const STAT_TIERS = ["S", "A", "B", "C"] as const;

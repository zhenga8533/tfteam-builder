/** The subset of tft-league-v1 and tft-match-v1 responses the crawler reads. */

export interface LeagueEntry {
  puuid: string;
  tier?: string;
  rank?: string;
  inactive?: boolean;
}

export interface LeagueList {
  tier: string;
  entries: LeagueEntry[];
}

export interface MatchUnit {
  character_id: string;
  tier: number;
  itemNames?: string[];
}

export interface MatchTrait {
  name: string;
  num_units: number;
  tier_current: number;
}

export interface MatchParticipant {
  placement: number;
  traits: MatchTrait[];
  units: MatchUnit[];
}

export interface Match {
  metadata: { match_id: string };
  info: {
    queue_id?: number;
    game_version: string;
    game_datetime: number;
    tft_set_number: number;
    tft_game_type?: string;
    participants: MatchParticipant[];
  };
}

/** Rank buckets, highest first. A match inherits the bucket of the player it was discovered through. */
export const RANK_BUCKETS = ["master_plus", "diamond", "emerald", "platinum", "gold"] as const;
export type RankBucket = (typeof RANK_BUCKETS)[number];

/** `[games, placementSum, top4, wins]` — additive, so runs can be merged by summing. */
export type Counter = [number, number, number, number];

export interface Counters {
  matches: number;
  boards: number;
  /** Keyed by `character_id`; counted once per board. */
  units: Record<string, Counter>;
  /** Keyed by `character_id|star`. */
  unitStars: Record<string, Counter>;
  /** Keyed by item name; counted per equipped instance. */
  items: Record<string, Counter>;
  /** Keyed by `character_id|item`; counted per equipped instance. */
  unitItems: Record<string, Counter>;
  /** Keyed by `trait|tier_current` for active traits; counted once per board. */
  traits: Record<string, Counter>;
}

export interface PatchCounters {
  set: number;
  patch: string;
  updatedAt: string;
  buckets: Partial<Record<RankBucket, Counters>>;
}

export interface TrackedPlayer {
  puuid: string;
  bucket: RankBucket;
  /** Epoch seconds of the latest crawl; match lists are requested from this point on. */
  lastCrawledAt?: number;
}

export interface PlatformState {
  seededAt?: string;
  players: TrackedPlayer[];
}

/** When each live patch was first seen by the crawler, oldest first (epoch ms). */
export type PatchTimeline = { patch: string; since: number }[];

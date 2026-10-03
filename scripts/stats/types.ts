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
  level: number;
  /** The last round played: when the player was eliminated, or the game's final round for the winner. */
  last_round?: number;
  total_damage_to_players?: number;
  /** The player's Little Legend (or Chibi); `content_ID` matches CDragon's companions.json. */
  companion?: { content_ID: string };
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

/** `[unit, star, items]` with Riot's own names. */
export type BoardUnitRow = [unit: string, star: number, items: string[]];

/** `[trait, tierCurrent, numUnits]` for active traits only. */
export type BoardTraitRow = [trait: string, tierCurrent: number, numUnits: number];

/**
 * One player's final board, the unit of stored match data. Names are Riot's own; mapping to the
 * site's data happens at build time, so stored boards stay valid when the game data changes.
 */
export type BoardRow = [
  matchId: string,
  gameTimeSec: number,
  bucket: RankBucket,
  placement: number,
  level: number,
  units: BoardUnitRow[],
  traits: BoardTraitRow[],
  // Added later, so boards stored before then don't have it.
  extras?: BoardExtras,
];

/** Board details beyond the original fields, by name so more can be added without tracking positions. */
export interface BoardExtras {
  /** The last round played: when the player was knocked out, or the game's final round for the winner. */
  lastRound?: number;
  /** Damage dealt to other players. */
  damage?: number;
  /** The Little Legend's content ID (CDragon's companions.json). */
  companion?: string;
}

export type { Counter } from "../../src/lib/game/stat-line.ts";
import type { Counter } from "../../src/lib/game/stat-line.ts";

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

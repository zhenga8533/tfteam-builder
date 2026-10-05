import { addCounter, bump as bumpCounter, emptyCounter } from "../../src/lib/game/stat-line.ts";
import type { BoardExtras, BoardRow, Counter, Counters, Match, PatchCounters, RankBucket } from "./types.ts";

const RANKED_QUEUE_ID = 1100;

/** Only standard ranked games say anything about the ranked meta. */
export const isRankedStandard = (match: Match) =>
  match.info.queue_id === RANKED_QUEUE_ID && (match.info.tft_game_type ?? "standard") === "standard";

export const emptyCounters = (): Counters => ({
  matches: 0,
  boards: 0,
  units: {},
  unitStars: {},
  items: {},
  unitItems: {},
  traits: {},
});

function bump(record: Record<string, Counter>, key: string, placement: number) {
  bumpCounter((record[key] ??= emptyCounter()), placement);
}

/** Splits a ranked match into one stored row per player, keeping only active traits. */
export function matchToRows(match: Match, bucket: RankBucket): BoardRow[] {
  const gameTime = Math.floor(match.info.game_datetime / 1000);
  return match.info.participants.map((participant) => {
    // JSON drops the undefined fields, so only what the match reported is stored.
    const extras: BoardExtras = { lastRound: participant.last_round, companion: participant.companion?.content_ID };
    return [
      match.metadata.match_id,
      gameTime,
      bucket,
      participant.placement,
      participant.level,
      participant.units.map((unit) => [unit.character_id, unit.tier, unit.itemNames ?? []]),
      participant.traits
        .filter((trait) => trait.tier_current > 0)
        .map((trait) => [trait.name, trait.tier_current, trait.num_units]),
      extras,
    ];
  });
}

/**
 * Adds one stored board. Units, traits, items and a unit's items all count once per board: a board can field
 * duplicate units or build an item several times.
 */
export function addBoard(counters: Counters, row: BoardRow) {
  const [, , , placement, , units, traits] = row;
  // Every standard match has exactly one winner, so counting first places counts matches.
  if (placement === 1) counters.matches += 1;
  counters.boards += 1;
  for (const unit of new Set(units.map(([unit]) => unit))) bump(counters.units, unit, placement);
  for (const key of new Set(units.map(([unit, star]) => `${unit}|${star}`))) bump(counters.unitStars, key, placement);
  for (const item of new Set(units.flatMap(([, , items]) => items))) bump(counters.items, item, placement);
  for (const key of new Set(units.flatMap(([unit, , items]) => items.map((item) => `${unit}|${item}`)))) {
    bump(counters.unitItems, key, placement);
  }
  for (const [trait, tier] of traits) bump(counters.traits, `${trait}|${tier}`, placement);
}

/** Adds a board to its patch's counters under the board's rank bucket. */
export function addBoardToPatch(patchCounters: PatchCounters, row: BoardRow) {
  addBoard((patchCounters.buckets[row[2]] ??= emptyCounters()), row);
}

function mergeRecord(target: Record<string, Counter>, source: Record<string, Counter>) {
  for (const [key, counter] of Object.entries(source)) addCounter((target[key] ??= emptyCounter()), counter);
}

/** Sums counters in place into `target`; used to combine rank buckets and runs. */
export function mergeCounters(target: Counters, source: Counters): Counters {
  target.matches += source.matches;
  target.boards += source.boards;
  mergeRecord(target.units, source.units);
  mergeRecord(target.unitStars, source.unitStars);
  mergeRecord(target.items, source.items);
  mergeRecord(target.unitItems, source.unitItems);
  mergeRecord(target.traits, source.traits);
  return target;
}

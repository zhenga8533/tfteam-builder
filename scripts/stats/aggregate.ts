import { addCounter, bump as bumpCounter, emptyCounter } from "../../src/lib/game/stat-line.ts";
import type { BoardRow, Counter, Counters, Match, PatchCounters, RankBucket } from "./types.ts";

export const RANKED_QUEUE_ID = 1100;

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
    const row: BoardRow = [
      match.metadata.match_id,
      gameTime,
      bucket,
      participant.placement,
      participant.level,
      participant.units.map((unit) => [unit.character_id, unit.tier, unit.itemNames ?? []]),
      participant.traits
        .filter((trait) => trait.tier_current > 0)
        .map((trait) => [trait.name, trait.tier_current, trait.num_units]),
    ];
    // Appended only when present: JSON would store trailing undefineds as nulls.
    if (participant.last_round !== undefined) {
      row.push(
        participant.last_round,
        participant.total_damage_to_players ?? 0,
        participant.companion?.content_ID ?? "",
      );
    }
    return row;
  });
}

/** Adds one stored board; unit and trait rates are per board (boards can field duplicates), items per instance. */
export function addBoard(counters: Counters, row: BoardRow) {
  const [, , , placement, , units, traits] = row;
  // Every standard match has exactly one winner, so counting first places counts matches.
  if (placement === 1) counters.matches += 1;
  counters.boards += 1;
  for (const unit of new Set(units.map(([unit]) => unit))) bump(counters.units, unit, placement);
  for (const key of new Set(units.map(([unit, star]) => `${unit}|${star}`))) bump(counters.unitStars, key, placement);
  for (const [unit, , items] of units) {
    for (const item of items) {
      bump(counters.items, item, placement);
      bump(counters.unitItems, `${unit}|${item}`, placement);
    }
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

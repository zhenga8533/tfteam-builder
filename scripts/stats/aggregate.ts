import type { BoardRow, Counter, Counters, Match, PatchCounters, PatchTimeline, RankBucket } from "./types.ts";

export const RANKED_QUEUE_ID = 1100;

/** `"Version 16.19.713.4213 (Sep 24 2026/10:10:00) [PUBLIC] <Releases/16.19>"` → `"16.19"`. */
export function patchFromGameVersion(gameVersion: string): string | null {
  const match = gameVersion.match(/(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}` : null;
}

/** Appends `patch` when it differs from the latest recorded patch. */
export function recordPatch(timeline: PatchTimeline, patch: string, now: number): PatchTimeline {
  return timeline.at(-1)?.patch === patch ? timeline : [...timeline, { patch, since: now }];
}

/**
 * Match data currently reports `"TFT Unreal Version ?.?.?.?"`, so the patch is usually inferred from
 * when the game was played. Games older than the timeline count toward its first patch.
 */
export function patchForMatch(match: Match, timeline: PatchTimeline): string | null {
  const fromVersion = patchFromGameVersion(match.info.game_version);
  if (fromVersion) return fromVersion;
  const played = match.info.game_datetime;
  return (timeline.findLast((entry) => entry.since <= played) ?? timeline[0])?.patch ?? null;
}

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
  const counter = (record[key] ??= [0, 0, 0, 0]);
  counter[0] += 1;
  counter[1] += placement;
  if (placement <= 4) counter[2] += 1;
  if (placement === 1) counter[3] += 1;
}

/** Splits a ranked match into one stored row per player, keeping only active traits. */
export function matchToRows(match: Match, bucket: RankBucket): BoardRow[] {
  const gameTime = Math.floor(match.info.game_datetime / 1000);
  return match.info.participants.map((participant) => [
    match.metadata.match_id,
    gameTime,
    bucket,
    participant.placement,
    participant.level,
    participant.units.map((unit) => [unit.character_id, unit.tier, unit.itemNames ?? []]),
    participant.traits
      .filter((trait) => trait.tier_current > 0)
      .map((trait) => [trait.name, trait.tier_current, trait.num_units]),
  ]);
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
  for (const [key, counter] of Object.entries(source)) {
    const [games, placementSum, top4, wins] = target[key] ?? [0, 0, 0, 0];
    target[key] = [games + counter[0], placementSum + counter[1], top4 + counter[2], wins + counter[3]];
  }
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

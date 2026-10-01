import type { Counter, Counters, Match, PatchCounters, PatchTimeline, RankBucket } from "./types.ts";

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

export function addMatch(counters: Counters, match: Match) {
  counters.matches += 1;
  for (const participant of match.info.participants) {
    const { placement } = participant;
    counters.boards += 1;

    // A board can field duplicate units; unit and trait rates are per board, items per instance.
    for (const characterId of new Set(participant.units.map((unit) => unit.character_id))) {
      bump(counters.units, characterId, placement);
    }
    for (const key of new Set(participant.units.map((unit) => `${unit.character_id}|${unit.tier}`))) {
      bump(counters.unitStars, key, placement);
    }
    for (const unit of participant.units) {
      for (const item of unit.itemNames ?? []) {
        bump(counters.items, item, placement);
        bump(counters.unitItems, `${unit.character_id}|${item}`, placement);
      }
    }
    for (const trait of participant.traits) {
      if (trait.tier_current > 0) bump(counters.traits, `${trait.name}|${trait.tier_current}`, placement);
    }
  }
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

export function addToPatch(patchCounters: PatchCounters, bucket: RankBucket, match: Match) {
  addMatch((patchCounters.buckets[bucket] ??= emptyCounters()), match);
}

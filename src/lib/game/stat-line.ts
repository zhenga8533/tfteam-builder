import type { StatLine } from "@/lib/data/schema";

/**
 * `[games, placementSum, top4, wins, …boards at 1st … 8th]`, all additive, so counters merge by summing
 * index by index. The per-placement counts are only published where a distribution is shown.
 */
export type Counter = [games: number, placementSum: number, top4: number, wins: number, ...places: number[]];

/** Placements in a lobby. */
const PLACEMENTS = 8;
const FIRST_PLACE_INDEX = 4;

export const emptyCounter = (): Counter => [0, 0, 0, 0, ...Array<number>(PLACEMENTS).fill(0)];

/** Adds `source` into `target` in place. */
export function addCounter(target: Counter, source: Counter) {
  source.forEach((value, index) => (target[index] = (target[index] ?? 0) + value));
  return target;
}

/** The counter stored under `key`, created empty on first use. */
export function counterFor<K>(map: Map<K, Counter>, key: K): Counter {
  let counter = map.get(key);
  if (!counter) map.set(key, (counter = emptyCounter()));
  return counter;
}

/** Weight, in games, of the 4.5 prior that small samples are pulled toward. */
const PRIOR_GAMES = 30;
const AVERAGE_PLACEMENT = 4.5;

export const adjustedAverage = ([games, placementSum]: Counter) =>
  (placementSum + PRIOR_GAMES * AVERAGE_PLACEMENT) / (games + PRIOR_GAMES);

/** Below this many games an average can swing a lot, so the UI marks the entry as a low sample. */
export const LOW_SAMPLE_GAMES = 30;

export const isLowSample = (line: { games: number }) => line.games < LOW_SAMPLE_GAMES;

/** Spread of single placements: every lobby has one of each place from 1 to 8. */
const PLACEMENT_SD = Math.sqrt(63 / 12);
/** How many standard errors a change in average placement must reach to count as more than chance. */
const CHANGE_Z = 2;

/** Whether two samples' average placements, `delta` apart, differ by more than their game counts would by chance. */
export const isRealChange = (delta: number, games: number, previousGames: number) =>
  Math.abs(delta) >= CHANGE_Z * PLACEMENT_SD * Math.sqrt(1 / games + 1 / previousGames);

export const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function bump(counter: Counter, placement: number) {
  counter[0] += 1;
  counter[1] += placement;
  if (placement <= 4) counter[2] += 1;
  if (placement === 1) counter[3] += 1;
  const place = FIRST_PLACE_INDEX + placement - 1;
  counter[place] = (counter[place] ?? 0) + 1;
}

/**
 * `play` is the counter's games as a share of `total`. With `places`, the line also carries how many
 * games ended at each placement (1st to 8th), for a distribution chart.
 */
export function statLine(counter: Counter, total: number, { places = false } = {}): StatLine {
  const [games, placementSum, top4, wins] = counter;
  return {
    ...(places && {
      places: counter.slice(FIRST_PLACE_INDEX, FIRST_PLACE_INDEX + PLACEMENTS).map((count) => count ?? 0),
    }),
    games,
    avg: round(placementSum / Math.max(games, 1), 2),
    score: round(adjustedAverage(counter), 2),
    top4: round(top4 / games, 4),
    win: round(wins / games, 4),
    play: round(games / Math.max(total, 1), 4),
  };
}

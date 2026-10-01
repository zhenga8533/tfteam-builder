import type { StatLine } from "@/lib/data/schema";

/** `[games, placementSum, top4, wins]` — additive, so samples can be merged by summing. */
export type Counter = [number, number, number, number];

/** Weight, in games, of the 4.5 prior that small samples are pulled toward. */
export const PRIOR_GAMES = 30;
const AVERAGE_PLACEMENT = 4.5;

export const adjustedAverage = ([games, placementSum]: Counter) =>
  (placementSum + PRIOR_GAMES * AVERAGE_PLACEMENT) / (games + PRIOR_GAMES);

export const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function bump(counter: Counter, placement: number) {
  counter[0] += 1;
  counter[1] += placement;
  if (placement <= 4) counter[2] += 1;
  if (placement === 1) counter[3] += 1;
}

/** `play` is the counter's games as a share of `total`. */
export function statLine(counter: Counter, total: number): StatLine {
  const [games, , top4, wins] = counter;
  return {
    games,
    avg: round(adjustedAverage(counter), 2),
    top4: round(top4 / games, 4),
    win: round(wins / games, 4),
    play: round(games / Math.max(total, 1), 4),
  };
}

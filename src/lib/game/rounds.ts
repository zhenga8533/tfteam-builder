/** Rounds in stage 1 (a carousel and three PvE rounds); every later stage has seven. */
const FIRST_STAGE_ROUNDS = 4;
const STAGE_ROUNDS = 7;

/** A game's round count (`last_round` in match data) as the in-game stage and round, e.g. 30 → "5-5". */
export function stageRound(round: number): string {
  if (round <= FIRST_STAGE_ROUNDS) return `1-${Math.max(round, 1)}`;
  const past = round - FIRST_STAGE_ROUNDS - 1;
  return `${Math.floor(past / STAGE_ROUNDS) + 2}-${(past % STAGE_ROUNDS) + 1}`;
}

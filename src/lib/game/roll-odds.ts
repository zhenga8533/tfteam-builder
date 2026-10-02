/** Units offered per shop. */
export const SHOP_SLOTS = 5;
/** Gold per reroll. */
export const REROLL_COST = 2;
/** Copies needed for each star level, counting from zero copies. */
export const COPIES_FOR_STAR = { 2: 3, 3: 9 } as const;
/** Shops looked at when working out the expected cost; beyond this the chance is treated as never. */
const MAX_SHOPS = 500;

export interface RollInput {
  /** Chance of the champion's cost in one shop slot at the player's level. */
  costOdds: number;
  /** Copies of each champion of that cost in the full pool. */
  copiesPerChampion: number;
  /** Champions of that cost in the pool. */
  championsOfCost: number;
  /** Copies of this champion already taken (yours and other players'). */
  taken: number;
  /** Copies of other champions of the same cost taken out of the pool. */
  othersTaken: number;
  /** More copies wanted. */
  wanted: number;
}

export interface RollOdds {
  /** `byShop[n]`: the chance of having all wanted copies after looking at `n` shops (index 0 = none yet). */
  byShop: number[];
  /** Expected shops until hitting; null when it can't happen (not enough copies left, or a 0% cost). */
  expectedShops: number | null;
}

/**
 * Chance of finding `wanted` more copies of a champion over successive shops. Each slot rolls a cost by
 * the level's odds, then a random remaining copy of that cost, so each copy found makes the next rarer.
 * Slots are treated as independent draws, the usual approximation for shop odds.
 */
export function rollOdds(input: RollInput, shops: number): RollOdds {
  const remaining = input.copiesPerChampion - input.taken;
  const pool = input.copiesPerChampion * input.championsOfCost - input.taken - input.othersTaken;
  const impossible = input.wanted > remaining || input.costOdds === 0 || pool <= 0;
  if (input.wanted <= 0) return { byShop: Array<number>(shops + 1).fill(1), expectedShops: 0 };
  if (impossible) return { byShop: Array<number>(shops + 1).fill(0), expectedShops: null };

  // found[j]: chance of having found exactly j copies so far (the last state, all wanted, absorbs).
  let found = Array<number>(input.wanted + 1).fill(0);
  found[0] = 1;
  const slotHit = (j: number) => input.costOdds * ((remaining - j) / (pool - j));
  const byShop = [0];
  let expectedShops = 0;
  for (let shop = 1; shop <= Math.max(shops, MAX_SHOPS); shop++) {
    expectedShops += 1 - found[input.wanted]!;
    for (let slot = 0; slot < SHOP_SLOTS; slot++) {
      const next = Array<number>(input.wanted + 1).fill(0);
      for (let j = 0; j < input.wanted; j++) {
        const hit = slotHit(j);
        next[j]! += found[j]! * (1 - hit);
        next[j + 1]! += found[j]! * hit;
      }
      next[input.wanted]! += found[input.wanted]!;
      found = next;
    }
    if (shop <= shops) byShop.push(found[input.wanted]!);
  }
  return { byShop, expectedShops };
}

import type { SetData } from "../../src/lib/data/schema.ts";

/** The parts of the TFT map data (`map22.bin.json`) the shop extraction reads. */
export type RawMapData = Record<string, Record<string, unknown> | undefined>;

interface RawDropRates {
  mDropRatesByLevel?: Record<string, unknown>[];
}

interface RawTierBags {
  TierBags?: { TierBagEntries?: { ShopData?: string; Count?: number }[] }[];
}

const COSTS = 5;
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * A set's shop odds by level and its champion pool, from Riot's map data. Odds are stored under a hashed
 * field name, so the first array of five numbers in each level entry is taken. Null when the set has no
 * shop data (older sets).
 */
export function buildShop(map: RawMapData, setNumber: number): SetData["shop"] | null {
  const set = map[`Maps/Shipping/Map22/Sets/TFTSet${setNumber}`] as
    { DropRateTables?: { Shop?: string }; ShopContentData?: string } | undefined;
  const odds = set?.DropRateTables?.Shop ? (map[set.DropRateTables.Shop] as RawDropRates | undefined) : undefined;
  const bags = set?.ShopContentData ? (map[set.ShopContentData] as RawTierBags | undefined) : undefined;
  if (!odds?.mDropRatesByLevel || !bags?.TierBags) return null;

  const byLevel = odds.mDropRatesByLevel.map((entry) => {
    const rates = Object.values(entry).find(
      (value): value is number[] => Array.isArray(value) && value.length === COSTS,
    );
    return (rates ?? Array<number>(COSTS).fill(0)).map(round);
  });
  const pool = bags.TierBags.slice(0, COSTS).map((bag, index) => {
    const entries = bag.TierBagEntries ?? [];
    return {
      cost: index + 1,
      champions: entries.flatMap((entry) => entry.ShopData?.split("/").at(-1) ?? []),
      copies: entries[0]?.Count ?? 0,
    };
  });
  return { odds: byLevel, pool };
}

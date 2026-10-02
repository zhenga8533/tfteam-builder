import { describe, expect, it } from "vitest";
import { rollOdds } from "./roll-odds";

const base = { costOdds: 0.3, copiesPerChampion: 10, championsOfCost: 10, taken: 0, othersTaken: 0, wanted: 1 };

describe("roll odds", () => {
  it("matches the closed form for one copy from a fresh pool", () => {
    // One slot hits with 0.3 × 10/100 = 3%; one shop has five slots.
    const { byShop } = rollOdds(base, 2);
    expect(byShop[1]).toBeCloseTo(1 - 0.97 ** 5, 6);
    expect(byShop[2]).toBeCloseTo(1 - 0.97 ** 10, 6);
  });

  it("gets harder as the pool drains and impossible when too few copies are left", () => {
    const fresh = rollOdds({ ...base, wanted: 3 }, 20).byShop[20]!;
    const contested = rollOdds({ ...base, wanted: 3, taken: 5 }, 20).byShop[20]!;
    expect(contested).toBeLessThan(fresh);
    expect(rollOdds({ ...base, wanted: 6, taken: 5 }, 20)).toEqual({ byShop: Array(21).fill(0), expectedShops: null });
    expect(rollOdds({ ...base, costOdds: 0 }, 5).expectedShops).toBeNull();
  });

  it("other champions leaving the pool make this one more likely", () => {
    const thinned = rollOdds({ ...base, othersTaken: 40 }, 1).byShop[1]!;
    expect(thinned).toBeGreaterThan(rollOdds(base, 1).byShop[1]!);
  });

  it("expects about 1 / per-shop chance shops for one copy", () => {
    const perShop = 1 - 0.97 ** 5;
    expect(rollOdds(base, 0).expectedShops).toBeCloseTo(1 / perShop, 1);
  });
});

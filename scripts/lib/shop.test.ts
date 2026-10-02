import { describe, expect, it } from "vitest";
import { buildShop } from "./shop.ts";

describe("buildShop", () => {
  const map = {
    "Maps/Shipping/Map22/Sets/TFTSet18": { DropRateTables: { Shop: "{odds}" }, ShopContentData: "{bags}" },
    "{odds}": {
      mDropRatesByLevel: [{ "{h}": [1, 0, 0, 0, 0] }, { "{h}": [1, 0, 0, 0, 0] }, { "{h}": [0.75, 0.25, 0, 0, 0] }],
    },
    "{bags}": {
      TierBags: [
        { TierBagEntries: [{ ShopData: "Maps/Shipping/Map22/Sets/TFTSet18/Shop/DA_18_Akali_AD", Count: 30 }] },
        {
          TierBagEntries: [
            { ShopData: "x/DA_18_Alistar", Count: 25 },
            { ShopData: "x/DA_18_Elise", Count: 25 },
          ],
        },
      ],
    },
  };

  it("reads odds by level and the pool by cost", () => {
    expect(buildShop(map, 18)).toEqual({
      odds: [
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [0.75, 0.25, 0, 0, 0],
      ],
      pool: [
        { cost: 1, champions: ["DA_18_Akali_AD"], copies: 30 },
        { cost: 2, champions: ["DA_18_Alistar", "DA_18_Elise"], copies: 25 },
      ],
    });
  });

  it("is null for sets without shop data", () => {
    expect(buildShop(map, 3)).toBeNull();
  });
});

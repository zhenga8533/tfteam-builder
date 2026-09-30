import { describe, expect, it } from "vitest";
import type { RawItem, RawSet } from "./cdragon.ts";
import { buildItems, gameAssetUrl, parseAugmentTier, pluginAssetUrl } from "./transform.ts";

const rawItem = (overrides: Partial<RawItem> & Pick<RawItem, "apiName" | "name">): RawItem => ({
  desc: "",
  icon: "ASSETS/Maps/TFT/Icons/Items/Hexcore/item.tex",
  composition: [],
  effects: {},
  associatedTraits: [],
  unique: false,
  ...overrides,
});

describe("asset urls", () => {
  it("lowercases game paths and swaps the extension for png", () => {
    expect(gameAssetUrl("latest", "ASSETS/UX/TraitIcons/Trait_Icon_18_Elderwood.tex")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_18_elderwood.png",
    );
  });

  it("returns an empty string for missing icons", () => {
    expect(gameAssetUrl("latest", "None")).toBe("");
    expect(gameAssetUrl("latest", null)).toBe("");
  });

  it("maps client plugin paths to the rcp-be-lol-game-data plugin", () => {
    expect(
      pluginAssetUrl("pbe", "/lol-game-data/assets/ASSETS/Characters/TFT18_Gromp/TFT18_Gromp_Square.TFT_Set18.jpg"),
    ).toBe(
      "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/characters/tft18_gromp/tft18_gromp_square.tft_set18.png",
    );
  });
});

describe("parseAugmentTier", () => {
  it.each([
    ["assets/augments/hexcore/beltoverflow_iii.tex", 3],
    ["assets/augments/hexcore/golden-gifts-ii.tex", 2],
    ["assets/augments/hexcore/woodaxiom_i.tex", 1],
    ["assets/augments/hexcore/bandthieves3.tex", 3],
    ["assets/augments/hexcore/mystery.tex", null],
  ])("%s → %s", (icon, tier) => {
    expect(parseAugmentTier(icon)).toBe(tier);
  });
});

describe("buildItems", () => {
  const items = [
    rawItem({ apiName: "TFT_Item_BFSword", name: "B.F. Sword" }),
    rawItem({ apiName: "DA_Component_BFSword", name: "B.F. Sword" }),
    rawItem({ apiName: "DA_Component_Gloves", name: "Sparring Gloves" }),
    rawItem({ apiName: "DA_Component_Spatula", name: "Spatula" }),
    rawItem({
      apiName: "TFT_Item_InfinityEdge",
      name: "Infinity Edge",
      composition: ["TFT_Item_BFSword", "TFT_Item_BFSword"],
    }),
    rawItem({
      apiName: "DA_InfinityEdge",
      name: "Infinity Edge",
      composition: ["DA_Component_BFSword", "DA_Component_Gloves"],
    }),
    rawItem({
      apiName: "DA_EmblemFae",
      name: "Fae Emblem",
      composition: ["DA_Component_Spatula", "DA_Component_BFSword"],
    }),
    rawItem({ apiName: "DA_InfinityEdgeRadiant", name: "Radiant Infinity Edge" }),
    rawItem({ apiName: "DA_PotionRadiant", name: "Radiant Potion" }),
    rawItem({ apiName: "DA_Artifact_Anvil", name: "Artifact Anvil" }),
    rawItem({ apiName: "DA_Artifact_Fishbones", name: "Fishbones" }),
    rawItem({ apiName: "DA_Augment_Thing", name: "Some_Placeholder" }),
  ];
  const set = { items: items.map((item) => item.apiName) } as RawSet;
  const result = buildItems(set, new Map(items.map((item) => [item.apiName, item])), "latest");
  const byKind = (kind: string) => result.filter((item) => item.kind === kind).map((item) => item.apiName);

  it("prefers the set-specific completed item over the generic duplicate", () => {
    expect(byKind("completed")).toEqual(["DA_InfinityEdge"]);
  });

  it("derives components from the chosen recipes only", () => {
    expect(byKind("component").sort()).toEqual(["DA_Component_BFSword", "DA_Component_Gloves", "DA_Component_Spatula"]);
  });

  it("classifies emblems, radiants and artifacts and drops placeholders", () => {
    expect(byKind("emblem")).toEqual(["DA_EmblemFae"]);
    expect(byKind("radiant")).toEqual(["DA_InfinityEdgeRadiant"]);
    expect(byKind("artifact")).toEqual(["DA_Artifact_Fishbones"]);
    expect(result.some((item) => item.name.includes("_"))).toBe(false);
  });
});

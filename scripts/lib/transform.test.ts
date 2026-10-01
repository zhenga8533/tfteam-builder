import { describe, expect, it } from "vitest";
import type { RawChampion, RawItem, RawSet, RawTrait } from "./cdragon.ts";
import {
  buildAugments,
  buildItems,
  buildSet,
  championRole,
  championTraitApiNames,
  gameAssetUrl,
  parseAugmentTier,
  pluginAssetUrl,
} from "./transform.ts";

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
    rawItem({ apiName: "DA_EmblemFaeAugment", name: "Fae Emblem" }),
    rawItem({ apiName: "DA_InfinityEdgeRadiant", name: "Radiant Infinity Edge" }),
    rawItem({ apiName: "DA_PotionRadiant", name: "Radiant Potion" }),
    rawItem({ apiName: "DA_Artifact_Anvil", name: "Artifact Anvil" }),
    rawItem({ apiName: "DA_Artifact_Fishbones", name: "Fishbones" }),
    rawItem({ apiName: "DA_Augment_Thing", name: "Some_Placeholder" }),
  ];
  const set = { items: items.map((item) => item.apiName) } as RawSet;
  const { items: result, aliases } = buildItems(set, new Map(items.map((item) => [item.apiName, item])), "latest");
  const byKind = (kind: string) => result.filter((item) => item.kind === kind).map((item) => item.apiName);

  it("prefers the set-specific completed item over the generic duplicate", () => {
    expect(byKind("completed")).toEqual(["DA_InfinityEdge"]);
  });

  it("prefers a described duplicate over an empty set-specific stub", () => {
    const stub = rawItem({ apiName: "DA_Deathblade", name: "Deathblade", composition: ["A", "A"], desc: null });
    const real = rawItem({
      apiName: "TFT_Item_Deathblade",
      name: "Deathblade",
      composition: ["B", "B"],
      desc: "Gain AD",
    });
    const pool = [stub, real];
    const { items: built } = buildItems(
      { items: pool.map((item) => item.apiName) } as RawSet,
      new Map(pool.map((item) => [item.apiName, item])),
      "latest",
    );
    expect(built.find((item) => item.kind === "completed")?.apiName).toBe("TFT_Item_Deathblade");
  });

  it("derives components from the chosen recipes only", () => {
    expect(byKind("component").sort()).toEqual(["DA_Component_BFSword", "DA_Component_Gloves", "DA_Component_Spatula"]);
  });

  it("maps discarded duplicates, including their components, to the kept apiName", () => {
    expect(aliases).toEqual({
      TFT_Item_InfinityEdge: "DA_InfinityEdge",
      TFT_Item_BFSword: "DA_Component_BFSword",
      DA_EmblemFaeAugment: "DA_EmblemFae",
    });
  });

  it("classifies emblems, radiants and artifacts and drops placeholders", () => {
    expect(byKind("emblem")).toEqual(["DA_EmblemFae"]);
    expect(byKind("radiant")).toEqual(["DA_InfinityEdgeRadiant"]);
    expect(byKind("artifact")).toEqual(["DA_Artifact_Fishbones"]);
    expect(result.some((item) => item.name.includes("_"))).toBe(false);
  });
});

describe("buildAugments", () => {
  it("keeps the entry with effect values when an augment is listed twice", () => {
    const icon = "assets/augments/hexcore/bandthieves3.tex";
    const pool = [
      rawItem({ apiName: "DA_BandOfThievesII", name: "Band of Thieves II", icon }),
      rawItem({ apiName: "TFT_Augment_BandOfThieves2", name: "Band of Thieves II", icon, effects: { Gloves: 2 } }),
      rawItem({ apiName: "TFT_Augment_BeltOverflow", name: "Belt Overflow", icon: "belt_iii.tex" }),
    ];
    const set = { augments: pool.map((item) => item.apiName) } as RawSet;
    const result = buildAugments(set, new Map(pool.map((item) => [item.apiName, item])), "latest");
    expect(result.map((augment) => augment.apiName)).toEqual([
      "TFT_Augment_BandOfThieves2",
      "TFT_Augment_BeltOverflow",
    ]);
  });
});

describe("buildSet champions and traits", () => {
  const rawChampion = (apiName: string, name: string, traits: string[]): RawChampion => ({
    apiName,
    name,
    cost: 5,
    traits,
    squareIcon: null,
    tileIcon: `ASSETS/Characters/${apiName}.tex`,
    icon: null,
    role: null,
    ability: { name: "", desc: "", icon: null, variables: [] },
    stats: {},
  });
  const rawTrait = (apiName: string, name: string, minUnits: number | null): RawTrait => ({
    apiName,
    name,
    desc: "",
    icon: null,
    effects: [{ minUnits, maxUnits: null, style: 1, variables: {} }],
  });
  const set: RawSet = {
    number: 18,
    mutator: "TFTSet18",
    name: "Set18",
    champions: [
      rawChampion("Lux", "Lux", ["Avatar", "Mage"]),
      rawChampion("Lux_Coven", "Lux (Coven)", ["Avatar", "Coven"]),
      rawChampion("MF", "Miss Fortune", ["Gunner"]),
      rawChampion("MF_Clone", "Miss Fortune", ["Gunner", "Clone"]),
      rawChampion("Dummy", "Training Dummy", []),
    ],
    traits: [
      rawTrait("T_Avatar", "Avatar", 1),
      rawTrait("T_Mage", "Mage", 2),
      rawTrait("T_Coven", "Coven", 3),
      rawTrait("T_Gunner", "Gunner", 2),
      rawTrait("T_Clone", "Clone", 1),
      rawTrait("T_Eclipse", "Eclipse", null),
      rawTrait("T_MechanicMage", "Mage", 1),
    ],
    items: [],
    augments: [],
  };
  const planner = {
    TFTSet18: ["Lux", "MF"].map((id, i) => ({
      character_id: id,
      team_planner_code: i + 1,
      squareIconPath: "",
      squareSplashIconPath: "",
    })),
  };

  it("makes named forms champions of their own and maps unnamed clones to their base", () => {
    const data = buildSet(set, new Map(), planner, "latest");
    expect(data.champions.map((champion) => champion.apiName)).toEqual(["Lux", "Lux_Coven", "MF"]);
    const coven = data.champions.find((champion) => champion.apiName === "Lux_Coven")!;
    expect(coven).toMatchObject({ name: "Lux (Coven)", formOf: "Lux", traits: ["T_Avatar", "T_Coven"] });
    expect(coven.plannerCode).toBeUndefined();
    expect(data.championAliases).toEqual({ MF_Clone: "MF" });
  });

  it("detects forms without team planner data too", () => {
    const data = buildSet(set, new Map(), {}, "latest");
    expect(data.champions.map((champion) => champion.apiName).sort()).toEqual(["Lux", "Lux_Coven", "MF", "MF_Clone"]);
    expect(data.championAliases).toEqual({});
  });

  it("keeps every trait, tags its source, and resolves champion traits by name safely", () => {
    const data = buildSet(set, new Map(), planner, "latest");
    const sources = Object.fromEntries(data.traits.map((trait) => [trait.apiName, trait.source]));
    expect(sources).toEqual({
      T_Avatar: "champion",
      T_Mage: "champion",
      T_Coven: "champion",
      T_Gunner: "champion",
      T_Clone: "champion",
      T_Eclipse: "other",
      T_MechanicMage: "other",
    });
    expect(data.champions.find((champion) => champion.apiName === "Lux")?.traits).toEqual(["T_Avatar", "T_Mage"]);
    expect(data.traits.find((trait) => trait.apiName === "T_Eclipse")?.breakpoints[0]).toMatchObject({ minUnits: 1 });
  });
});

describe("championTraitApiNames", () => {
  it("picks the base trait when variants share its name (Set 17 Stargazer)", () => {
    const trait = (apiName: string): RawTrait => ({ apiName, name: "Stargazer", desc: "", icon: null, effects: [] });
    const traits = [trait("TFT17_Stargazer_Wolf"), trait("TFT17_Stargazer"), trait("TFT17_Stargazer_Serpent")];
    expect([...championTraitApiNames(traits, new Set(["Stargazer"]))]).toEqual(["TFT17_Stargazer"]);
  });
});

describe("championRole", () => {
  it("names roles the way the game does", () => {
    expect(championRole("APCaster")).toBe("Magic Caster");
    expect(championRole("ADCarryCrit")).toBe("Attack Marksman");
    expect(championRole("APCasterHighMana")).toBe("Magic Caster");
    expect(championRole("HFighter")).toBe("Hybrid Fighter");
    expect(championRole("ADReaper")).toBe("Attack Assassin");
    expect(championRole("TutorialADCarry")).toBeUndefined();
    expect(championRole(null)).toBeUndefined();
  });
});

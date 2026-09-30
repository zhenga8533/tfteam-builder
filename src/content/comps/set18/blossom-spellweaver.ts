import type { Comp } from "../../types";

export default {
  slug: "set18-blossom-spellweaver",
  name: "Blossom Spellweaver",
  set: 18,
  tier: "S",
  trend: "up",
  playstyle: "Fast 8",
  difficulty: "Medium",
  summary:
    "Stack Blossom for scaling Wisp upgrades while Ahri carries from the backline with Spellweaver. Play strongest board early, then push to level 8 for Ashe and Sett.",
  board: [
    { apiName: "DA_18_Sett", hex: 2, star: 2, items: ["TFT_Item_WarmogsArmor", "TFT_Item_GargoyleStoneplate"] },
    { apiName: "DA_Fiddlesticks18", hex: 3, star: 2, items: ["TFT_Item_Redemption"] },
    { apiName: "DA_18_MasterYi_AD", hex: 4, star: 2 },
    { apiName: "DA_18_Yunara", hex: 21, star: 2 },
    { apiName: "DA_18_Cassiopeia", hex: 23, star: 2 },
    {
      apiName: "DA_18_Ahri",
      hex: 24,
      star: 2,
      carry: true,
      items: ["TFT_Item_JeweledGauntlet", "TFT_Item_BlueBuff", "TFT_Item_RabadonsDeathcap"],
    },
    { apiName: "DA_Karma18", hex: 26, star: 2 },
    { apiName: "DA_18_Ashe", hex: 27, items: ["TFT_Item_GuinsoosRageblade"] },
  ],
  early: [
    { apiName: "DA_18_Yorick", hex: 3 },
    { apiName: "DA_18_Yunara", hex: 22 },
    { apiName: "DA_Karma18", hex: 24 },
  ],
  augments: ["DA_18_BlossomTraitAugment", "TFT_Augment_AimForTheTop", "DA_AugmentedPower"],
  tips: [
    "Slam Blue Buff or Jeweled Gauntlet early; both go on Ahri later.",
    "Karma and Yunara can hold Ahri's items until you find her.",
    "Position Ahri away from the side enemy assassins jump to.",
  ],
  updatedAt: "2026-09-30",
} satisfies Comp;

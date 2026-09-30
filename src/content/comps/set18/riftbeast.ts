import type { Comp } from "../../types";

export default {
  slug: "set18-riftbeast",
  name: "Riftbeast Elder Dragon",
  set: 18,
  tier: "A",
  playstyle: "Fast 9",
  difficulty: "Hard",
  summary:
    "Collect Riftbeasts from the jungle roster and build toward seven for the full bonus. Sentinel carries until Elder Dragon comes online at level 9.",
  board: [
    {
      apiName: "DA_Brambleback18",
      hex: 2,
      star: 2,
      items: ["TFT_Item_Bloodthirster", "TFT_Item_TitansResolve", "TFT_Item_SteraksGage"],
    },
    { apiName: "DA_Krug18", hex: 3, star: 2, items: ["TFT_Item_BrambleVest"] },
    { apiName: "DA_Murkwolf18", hex: 4, star: 2 },
    { apiName: "DA_Gromp18_AP", hex: 22, star: 2 },
    { apiName: "DA_18_Sentry", hex: 23, star: 2 },
    {
      apiName: "DA_Sentinel18",
      hex: 24,
      star: 2,
      carry: true,
      items: ["TFT_Item_SpearOfShojin", "TFT_Item_JeweledGauntlet", "TFT_Item_ArchangelsStaff"],
    },
    { apiName: "DA_CrimsonRaptor18", hex: 25, star: 2 },
    { apiName: "DA_18_ElderDragon", hex: 27, carry: true },
  ],
  augments: ["TFT9_Augment_BigGrabBag", "TFT_Augment_TheBaronsLair"],
  tips: ["Hold pairs of Riftbeasts on the bench; the trait rewards width over upgrades."],
  updatedAt: "2026-09-30",
} satisfies Comp;

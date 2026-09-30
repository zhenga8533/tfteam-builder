import type { Comp } from "../../types";

export default {
  slug: "set18-rapidfire-xayah",
  name: "Rapidfire Xayah Reroll",
  set: 18,
  tier: "B",
  trend: "new",
  playstyle: "Reroll",
  difficulty: "Easy",
  summary:
    "Slow roll at level 6 for three-star Xayah and Rakan, then add Fae and Rapidfire units around them. Strong when Guinsoo's Rageblade comes early.",
  board: [
    { apiName: "DA_18_Rakan", hex: 2, star: 3, items: ["TFT_Item_WarmogsArmor", "TFT_Item_DragonsClaw"] },
    { apiName: "DA_18_Lillia", hex: 3, items: ["TFT_Item_NightHarvester"] },
    { apiName: "DA_18_Varus", hex: 21, star: 2 },
    { apiName: "DA_18_Kayle", hex: 22, star: 2 },
    {
      apiName: "DA_18_Xayah",
      hex: 24,
      star: 3,
      carry: true,
      items: ["TFT_Item_GuinsoosRageblade", "TFT_Item_InfinityEdge", "TFT_Item_LastWhisper"],
    },
    { apiName: "DA_18_Tristana", hex: 25, star: 2 },
    { apiName: "DA_18_Aphelios", hex: 26 },
    { apiName: "DA_CrimsonRaptor18", hex: 27 },
  ],
  augments: ["TFT7_Augment_BestFriends2", "DA_BoxingLessons"],
  tips: ["Don't level past 7 until Xayah and Rakan are three-star."],
  updatedAt: "2026-09-30",
} satisfies Comp;

import type { TierList } from "../types";

export default {
  set: 18,
  items: {
    S: ["TFT_Item_JeweledGauntlet", "TFT_Item_GuinsoosRageblade", "TFT_Item_BlueBuff"],
    A: ["TFT_Item_SpearOfShojin", "TFT_Item_WarmogsArmor", "TFT_Item_InfinityEdge", "TFT_Item_Bloodthirster"],
    B: ["TFT_Item_RabadonsDeathcap", "TFT_Item_GargoyleStoneplate", "TFT_Item_LastWhisper"],
    C: ["TFT_Item_Deathblade", "TFT_Item_ThiefsGloves"],
  },
  augments: {
    S: ["DA_18_BlossomTraitAugment", "TFT9_Augment_BigGrabBag"],
    A: ["TFT_Augment_AimForTheTop", "TFT_Augment_TheBaronsLair", "DA_AugmentedPower"],
    B: ["TFT7_Augment_BestFriends2", "DA_BoxingLessons"],
  },
  updatedAt: "2026-09-30",
} satisfies TierList;

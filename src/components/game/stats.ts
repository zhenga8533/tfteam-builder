import abilityPower from "@/assets/stats/ability_power.webp";
import armor from "@/assets/stats/armor.webp";
import attackSpeed from "@/assets/stats/attack_speed.webp";
import critChance from "@/assets/stats/crit_chance.webp";
import damage from "@/assets/stats/damage.webp";
import gold from "@/assets/stats/gold.webp";
import health from "@/assets/stats/health.webp";
import magicResist from "@/assets/stats/magic_resist.webp";
import mana from "@/assets/stats/mana.webp";
import range from "@/assets/stats/range.webp";

export const STAT_ICONS = {
  abilityPower,
  armor,
  attackSpeed,
  critChance,
  damage,
  gold,
  health,
  magicResist,
  mana,
  range,
} as const;

export type Stat = keyof typeof STAT_ICONS;

/** Maps Riot's `%i:scaleX%` markup names onto our stat icons. */
const MARKUP_STATS: Record<string, Stat> = {
  scaleAP: "abilityPower",
  scaleAD: "damage",
  TFTBaseAD: "damage",
  scaleHealth: "health",
  scaleArmor: "armor",
  scaleMR: "magicResist",
  scaleAS: "attackSpeed",
  scaleCrit: "critChance",
  scaleCritMult: "critChance",
  scaleManaRegen: "mana",
  TFTManaRegen: "mana",
  scaleRange: "range",
  goldCoins: "gold",
};

export const statFromMarkup = (markup: string): Stat | undefined => MARKUP_STATS[markup];

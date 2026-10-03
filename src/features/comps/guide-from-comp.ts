import type { GuideDetails } from "@/content/serialize";
import type { AutoComp } from "@/lib/data/schema";

/**
 * A starting point for a guide on a detected comp: its name, carries and tier, and a playstyle guessed
 * from the board (3-star carries mean reroll; otherwise the usual final level).
 */
export function guideFromComp(comp: AutoComp): Partial<GuideDetails> {
  const rerolls = comp.units.some((unit) => comp.carries.includes(unit.apiName) && unit.star === 3);
  return {
    name: comp.name,
    carries: comp.carries,
    ...(comp.tier && { tier: comp.tier }),
    playstyle: rerolls ? "Reroll" : comp.level >= 9 ? "Fast 9" : "Fast 8",
  };
}

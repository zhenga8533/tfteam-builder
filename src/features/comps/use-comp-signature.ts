import type { CompUnit } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";
import { compSignature, isUniqueTrait, pickCarries, pickCoreTraits } from "@/lib/game/comp-signature";
import { useCompTraits } from "./use-comp-traits";

/** The same signature the stats build gives boards, so a guide can be matched to a detected comp. */
export function useCompSignature(units: CompUnit[]): string {
  const { championsByApi } = useGameData();
  const traits = useCompTraits(units);
  const carries = pickCarries(
    units.map((unit) => ({
      apiName: unit.apiName,
      items: unit.items?.length ?? 0,
      cost: championsByApi.get(unit.apiName)?.cost ?? 0,
    })),
  );
  const core = pickCoreTraits(
    traits
      .filter(({ trait }) => trait.source === "champion" && !isUniqueTrait(trait))
      .map(({ trait, style, count }) => ({ apiName: trait.apiName, style, count })),
  );
  return compSignature(carries, core);
}

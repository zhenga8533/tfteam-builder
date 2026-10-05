import type { CompUnit } from "@/content/types";
import { type GameData, useGameData } from "@/lib/data/hooks";
import { compSignature, isUniqueTrait, pickCarries, pickCoreTraits } from "@/lib/game/comp-signature";
import { computeTraits } from "@/lib/game/traits";

/** The same signature the stats build gives boards, so a guide can be matched to a detected comp. */
export function boardSignature(
  units: CompUnit[],
  { championsByApi, traitsByApi, itemsByApi }: Pick<GameData, "championsByApi" | "traitsByApi" | "itemsByApi">,
): string {
  const carries = pickCarries(
    units.map((unit) => ({
      apiName: unit.apiName,
      items: unit.items?.length ?? 0,
      cost: championsByApi.get(unit.apiName)?.cost ?? 0,
    })),
  );
  const traits = computeTraits(
    units.map((unit) => ({ apiName: unit.apiName, items: unit.items ?? [] })),
    championsByApi,
    traitsByApi,
    itemsByApi,
  );
  const core = pickCoreTraits(
    traits
      .filter(({ trait, style }) => style !== "inactive" && trait.source === "champion" && !isUniqueTrait(trait))
      .map(({ trait, style, count }) => ({ apiName: trait.apiName, style, count })),
  );
  return compSignature(carries, core);
}

export function useCompSignature(units: CompUnit[]): string {
  return boardSignature(units, useGameData());
}

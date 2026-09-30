import { useMemo } from "react";
import type { CompUnit } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";
import { computeTraits } from "@/lib/game/traits";

/** Active traits for a comp board; inactive traits are left out. */
export function useCompTraits(units: CompUnit[]) {
  const { championsByApi, traitsByApi, itemsByApi } = useGameData();
  return useMemo(
    () =>
      computeTraits(
        units.map((unit) => ({ apiName: unit.apiName, items: unit.items ?? [] })),
        championsByApi,
        traitsByApi,
        itemsByApi,
      ).filter((state) => state.style !== "inactive"),
    [units, championsByApi, traitsByApi, itemsByApi],
  );
}

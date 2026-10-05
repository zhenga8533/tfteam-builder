import { useMemo } from "react";
import { compsForSet } from "@/content";
import type { Comp, CompUnit } from "@/content/types";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import type { AutoComp } from "@/lib/data/schema";
import { autoCompUnits } from "./auto-place";
import { boardSignature } from "./use-comp-signature";

/** A detected comp's board, positioned like the hand-written guide for the same comp (returned too) where there is one. */
export function useAutoCompUnits(comp: AutoComp): { units: CompUnit[]; guide?: Comp } {
  const { set } = useActiveSet();
  const data = useGameData();
  const guides = useMemo(
    () => new Map(compsForSet(set).map((guide) => [boardSignature(guide.board, data), guide])),
    [set, data],
  );
  return useMemo(() => {
    const guide = [comp.signature, ...comp.variants].map((signature) => guides.get(signature)).find(Boolean);
    return { units: autoCompUnits(comp, data.championsByApi, guide?.board), guide };
  }, [comp, data, guides]);
}

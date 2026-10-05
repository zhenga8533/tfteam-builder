import { useMemo } from "react";
import { compsForSet } from "@/content";
import type { CompUnit } from "@/content/types";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import type { AutoComp } from "@/lib/data/schema";
import { autoCompUnits } from "./auto-place";
import { boardSignature } from "./use-comp-signature";

/** A detected comp's board, positioned like the hand-written guide for the same comp where there is one. */
export function useAutoCompUnits(comp: AutoComp): CompUnit[] {
  const { set } = useActiveSet();
  const data = useGameData();
  const guides = useMemo(
    () => new Map(compsForSet(set).map((guide) => [boardSignature(guide.board, data), guide.board])),
    [set, data],
  );
  return useMemo(() => {
    const guide = [comp.signature, ...comp.variants].map((signature) => guides.get(signature)).find(Boolean);
    return autoCompUnits(comp, data.championsByApi, guide);
  }, [comp, data, guides]);
}

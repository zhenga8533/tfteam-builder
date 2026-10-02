import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { statsQuery } from "@/lib/data/queries";
import type { Champion } from "@/lib/data/schema";
import { boardUnits } from "@/lib/game/board";
import { autofillOptions, defaultMaxCost } from "@/lib/game/trait-planner";
import { useBuilderStore } from "./store";
import { useBuilder } from "./use-builder";

/** Boards offered in the autofill panel. */
const SUGGESTIONS = 3;

/**
 * Autofill suggestions for the open slots of the board being edited, using the saved goal. With
 * `enabled`, the top suggestions are kept up to date; otherwise `best()` searches when asked.
 */
export function useAutofill(enabled: boolean) {
  const data = useGameData();
  const { set, board, level, openSlots, setBoard, addChampions } = useBuilder();
  const { patch } = useActiveSet();
  // Not suspending: autofill works without stats, it just breaks ties by cost instead of placement.
  const stats = useQuery(statsQuery(patch, set)).data;
  const goal = useBuilderStore((state) => state.autofillGoal);
  const setGoal = useBuilderStore((state) => state.setAutofillGoal);
  const maxCost = goal.maxCost ?? defaultMaxCost(level);

  const search = (count: number) => {
    if (openSlots === 0) return [];
    const strength = stats
      ? (champion: Champion) => {
          const line = stats.units[champion.apiName];
          return line ? 4.5 - line.score : 0;
        }
      : undefined;
    // Flex units are optional, so suggestions build on the core board.
    const core = boardUnits(board).filter((unit) => !unit.flex);
    return autofillOptions(core, openSlots, data, goal, { maxCost, strength, count });
  };
  // The search takes tens of milliseconds, so it only runs ahead of time while the panel is open.
  const suggestions = useMemo(
    () => (enabled ? search(SUGGESTIONS) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `search` only reads the values listed.
    [enabled, openSlots, board, data, goal, maxCost, stats],
  );

  const apply = (champions: Champion[]) => {
    if (champions.length === 0) return;
    const previous = board;
    addChampions(champions);
    toast(`Added ${champions.map((champion) => champion.name).join(", ")}.`, {
      action: { label: "Undo", onClick: () => setBoard(previous) },
    });
  };

  /** The best suggestion right now, searched on demand. */
  const best = () => search(1)[0] ?? [];

  return { goal, setGoal, level, openSlots, maxCost, suggestions, best, apply };
}

import { useMemo } from "react";
import { toast } from "sonner";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { computeTraits } from "@/lib/game/traits";
import * as B from "@/lib/game/board";
import { EMPTY_BOARD, useBuilderStore } from "./store";

/** Board state for the active set plus validated actions that report problems via toasts. */
export function useBuilder() {
  const { set } = useActiveSet();
  const data = useGameData();
  const board = useBuilderStore((state) => state.boards[set] ?? EMPTY_BOARD);
  const selected = useBuilderStore((state) => state.selected);
  const setStoreBoard = useBuilderStore((state) => state.setBoard);
  const select = useBuilderStore((state) => state.select);

  const commit = (next: B.Board) => setStoreBoard(set, next);

  const actions = {
    load: (next: B.Board) => {
      commit(next);
      select(null);
    },
    clear: () => {
      commit(B.createBoard());
      select(null);
    },
    select,
    place: (index: number, apiName: string) => {
      commit(B.placeChampion(board, index, apiName));
      select(index);
    },
    add: (apiName: string) => {
      const next = B.addChampion(board, apiName);
      if (next) commit(next);
      else toast.error("The board is full.");
    },
    move: (from: number, to: number) => {
      commit(B.moveUnit(board, from, to));
      if (selected === from) select(to);
      else if (selected === to) select(from);
    },
    remove: (index: number) => {
      commit(B.removeUnit(board, index));
      if (selected === index) select(null);
    },
    setStar: (index: number, star: B.StarLevel) => commit(B.setStar(board, index, star)),
    equip: (index: number, itemApiName: string) => {
      const unit = board[index];
      const champion = unit && data.championsByApi.get(unit.apiName);
      const item = data.itemsByApi.get(itemApiName);
      if (!unit || !champion || !item) return false;
      const blocker = B.equipBlocker(unit, champion, item);
      if (blocker) {
        toast.error(blocker);
        return false;
      }
      commit(B.equipItem(board, index, itemApiName));
      return true;
    },
    /** Equips the selected unit, or the first unit with a free slot. */
    equipAnywhere: (itemApiName: string) => {
      const target =
        selected !== null && board[selected]
          ? selected
          : board.findIndex((unit) => unit !== null && unit.items.length < B.MAX_ITEMS);
      if (target === -1) toast.error("Place a unit with a free item slot first.");
      else actions.equip(target, itemApiName);
    },
    unequip: (index: number, itemIndex: number) => commit(B.unequipItem(board, index, itemIndex)),
  };

  return { set, board, selected, ...actions };
}

/** Derived board stats; kept separate so per-hex components don't recompute them. */
export function useBoardSummary() {
  const { set } = useActiveSet();
  const data = useGameData();
  const board = useBuilderStore((state) => state.boards[set] ?? EMPTY_BOARD);

  return useMemo(() => {
    const units = B.boardUnits(board);
    return {
      units,
      traits: computeTraits(units, data.championsByApi, data.traitsByApi, data.itemsByApi),
      cost: B.teamCost(units, data.championsByApi),
    };
  }, [board, data]);
}

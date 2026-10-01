import { useMemo } from "react";
import { toast } from "sonner";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { placementOrder } from "@/features/comps/auto-place";
import type { Champion } from "@/lib/data/schema";
import * as B from "@/lib/game/board";
import { autofill } from "@/lib/game/trait-planner";
import { computeTraits } from "@/lib/game/traits";
import { DEFAULT_LEVEL, EMPTY_TEAM, teamOf, useBuilderStore } from "./store";

const activeBoard = (team: { boards: B.LevelBoard[]; active: number }) =>
  team.boards[team.active] ?? team.boards[0] ?? { level: DEFAULT_LEVEL, board: B.createBoard() };

/** Board state for the active set plus validated actions that report problems via toasts. */
export function useBuilder() {
  const { set } = useActiveSet();
  const data = useGameData();
  const team = useBuilderStore((state) => state.teams[set] ?? EMPTY_TEAM);
  const selected = useBuilderStore((state) => state.selected);
  const setTeam = useBuilderStore((state) => state.setTeam);
  const select = useBuilderStore((state) => state.select);
  const { board, level } = activeBoard(team);

  /** Puts each champion where it would usually stand (melee front, ranged back); stops when the board is full. */
  const placeAll = (from: B.Board, champions: Champion[]) =>
    champions.reduce((next, champion) => {
      const hex = placementOrder(champion).find((index) => next[index] === null);
      return hex === undefined ? next : B.placeChampion(next, hex, champion.apiName);
    }, from);

  const commit = (next: B.Board) =>
    setTeam(set, {
      ...team,
      boards: team.boards.map((entry, i) => (i === team.active ? { ...entry, board: next } : entry)),
    });

  const actions = {
    /** Replaces the whole team, e.g. with a saved team or a comp. */
    load: (boards: B.LevelBoard[]) => {
      setTeam(set, boards.length ? teamOf(boards) : EMPTY_TEAM);
      select(null);
    },
    /** Replaces the board being edited, leaving the team's other levels alone. */
    setBoard: (next: B.Board) => {
      commit(next);
      select(null);
    },
    clear: () => actions.setBoard(B.createBoard()),
    select,
    showLevel: (index: number) => {
      setTeam(set, { ...team, active: index });
      select(null);
    },
    /** Adds a board for `newLevel`, starting as a copy of the board being edited. */
    addLevel: (newLevel: number) => {
      const boards = teamOf([...team.boards, { level: newLevel, board }]).boards;
      setTeam(set, { boards, active: boards.findIndex((entry) => entry.level === newLevel) });
      select(null);
    },
    changeLevel: (newLevel: number) => {
      const boards = teamOf(
        team.boards.map((entry, i) => (i === team.active ? { ...entry, level: newLevel } : entry)),
      ).boards;
      setTeam(set, { boards, active: boards.findIndex((entry) => entry.level === newLevel) });
    },
    removeLevel: () => {
      if (team.boards.length < 2) return;
      const boards = team.boards.filter((_, i) => i !== team.active);
      setTeam(set, { boards, active: Math.min(team.active, boards.length - 1) });
      select(null);
    },
    place: (index: number, apiName: string) => {
      commit(B.placeChampion(board, index, apiName));
      select(index);
    },
    add: (apiName: string) => {
      const next = B.addChampion(board, apiName);
      if (next) commit(next);
      else toast.error("The board is full.");
    },
    /** Adds a champion where it would usually stand, e.g. from the trait ladder. */
    addPlaced: (apiName: string) => {
      const champion = data.championsByApi.get(apiName);
      if (!champion) return;
      if (!board.includes(null)) toast.error("The board is full.");
      else commit(placeAll(board, [champion]));
    },
    /**
     * Fills the open slots up to the board's level with the champions that activate the most traits.
     * Flex units don't take a slot. Returns the champions added.
     */
    autofill: (strength?: (champion: Champion) => number): Champion[] => {
      const core = B.boardUnits(board).filter((unit) => !unit.flex);
      const slots = Math.min(level - core.length, board.filter((unit) => unit === null).length);
      if (slots <= 0) {
        toast(`Level ${level} already fields ${core.length} units.`);
        return [];
      }
      const picks = autofill(core, slots, data, strength);
      commit(placeAll(board, picks));
      select(null);
      return picks;
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
    toggleFlex: (index: number) => commit(B.toggleFlex(board, index)),
    addAlternative: (index: number, apiName: string) => commit(B.addAlternative(board, index, apiName)),
    removeAlternative: (index: number, apiName: string) => commit(B.removeAlternative(board, index, apiName)),
    swapAlternative: (index: number, apiName: string) => commit(B.swapAlternative(board, index, apiName)),
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

  return { set, board, level, boards: team.boards, active: team.active, selected, ...actions };
}

/** Derived board stats; kept separate so per-hex components don't recompute them. */
export function useBoardSummary() {
  const { set } = useActiveSet();
  const data = useGameData();
  const team = useBuilderStore((state) => state.teams[set] ?? EMPTY_TEAM);
  const { board } = activeBoard(team);

  return useMemo(() => {
    const units = B.boardUnits(board);
    const traitsOf = (list: B.BoardUnit[]) =>
      computeTraits(list, data.championsByApi, data.traitsByApi, data.itemsByApi);
    return {
      units,
      /** Traits from the core (non-flex) units, with how many more each gets from flex units. */
      traits: withFlexCounts(traitsOf(units.filter((unit) => !unit.flex)), traitsOf(units)),
      cost: B.teamCost(units, data.championsByApi),
    };
  }, [board, data]);
}

type TraitStates = ReturnType<typeof computeTraits>;

/** Core traits first (as ranked), then traits only flex units bring; `flex` is the extra count. */
function withFlexCounts(core: TraitStates, all: TraitStates) {
  const coreCounts = new Map(core.map((state) => [state.trait.apiName, state.count]));
  const allCounts = new Map(all.map((state) => [state.trait.apiName, state.count]));
  const flexOnly = all.filter((state) => !coreCounts.has(state.trait.apiName));
  return [
    ...core.map((state) => ({ ...state, flex: (allCounts.get(state.trait.apiName) ?? 0) - state.count })),
    ...flexOnly.map((state) => ({
      ...state,
      count: 0,
      activeIndex: -1,
      style: "inactive" as const,
      flex: state.count,
    })),
  ];
}

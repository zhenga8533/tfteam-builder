import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Board, createBoard } from "./board";

export interface SavedTeam {
  id: string;
  name: string;
  set: number;
  board: Board;
  savedAt: string;
}

interface BuilderState {
  /** The working board for each set, keyed by set number. */
  boards: Record<number, Board>;
  saved: SavedTeam[];
  /** Hex index of the unit being inspected; not persisted. */
  selected: number | null;
  setBoard: (set: number, board: Board) => void;
  select: (index: number | null) => void;
  saveTeam: (name: string, set: number, board: Board) => SavedTeam;
  deleteTeam: (id: string) => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      boards: {},
      saved: [],
      selected: null,
      setBoard: (setNumber, board) => set((state) => ({ boards: { ...state.boards, [setNumber]: board } })),
      select: (selected) => set({ selected }),
      saveTeam: (name, setNumber, board) => {
        const team: SavedTeam = {
          id: crypto.randomUUID(),
          name,
          set: setNumber,
          board,
          savedAt: new Date().toISOString(),
        };
        set((state) => ({ saved: [team, ...state.saved] }));
        return team;
      },
      deleteTeam: (id) => set((state) => ({ saved: state.saved.filter((team) => team.id !== id) })),
    }),
    {
      name: "tfteam-builder",
      version: 1,
      partialize: ({ boards, saved }) => ({ boards, saved }),
    },
  ),
);

export const EMPTY_BOARD = createBoard();

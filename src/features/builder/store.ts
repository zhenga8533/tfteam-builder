import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBoard, type LevelBoard } from "@/lib/game/board";
import type { AutofillGoal } from "@/lib/game/trait-planner";

/** A team being built: one board per player level, e.g. a level 6 early board and a level 8 final board. */
export interface BuilderTeam {
  /** Sorted by level. */
  boards: LevelBoard[];
  /** Index into `boards` of the board being edited. */
  active: number;
}

export interface SavedTeam {
  id: string;
  name: string;
  set: number;
  boards: LevelBoard[];
  savedAt: string;
}

/** Most boards are planned around level 8, so a fresh team starts there. */
export const DEFAULT_LEVEL = 8;
/** The level a comp guide's early board is loaded at. */
export const EARLY_LEVEL = 6;

/** A team from level boards, editing the highest level. */
export function teamOf(boards: LevelBoard[]): BuilderTeam {
  const sorted = boards.toSorted((a, b) => a.level - b.level);
  return { boards: sorted, active: sorted.length - 1 };
}

export const EMPTY_TEAM = teamOf([{ level: DEFAULT_LEVEL, board: createBoard() }]);

interface BuilderState {
  /** The working team for each set, keyed by set number. */
  teams: Record<number, BuilderTeam>;
  saved: SavedTeam[];
  /** Hex index of the unit being inspected; not persisted. */
  selected: number | null;
  setTeam: (set: number, team: BuilderTeam) => void;
  select: (index: number | null) => void;
  saveTeam: (name: string, set: number, boards: LevelBoard[]) => SavedTeam;
  deleteTeam: (id: string) => void;
  /** The last autofill choice, repeated by the Autofill button. */
  autofillGoal: AutofillGoal;
  setAutofillGoal: (goal: AutofillGoal) => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      teams: {},
      saved: [],
      selected: null,
      setTeam: (setNumber, team) => set((state) => ({ teams: { ...state.teams, [setNumber]: team } })),
      select: (selected) => set({ selected }),
      saveTeam: (name, setNumber, boards) => {
        const team: SavedTeam = {
          id: crypto.randomUUID(),
          name,
          set: setNumber,
          boards,
          savedAt: new Date().toISOString(),
        };
        set((state) => ({ saved: [team, ...state.saved] }));
        return team;
      },
      deleteTeam: (id) => set((state) => ({ saved: state.saved.filter((team) => team.id !== id) })),
      autofillGoal: { mode: "most" },
      setAutofillGoal: (autofillGoal) => set({ autofillGoal }),
    }),
    {
      // The project's former name; kept so visitors' saved teams survive the rename.
      name: "tfteam-builder",
      partialize: ({ teams, saved, autofillGoal }) => ({ teams, saved, autofillGoal }),
    },
  ),
);

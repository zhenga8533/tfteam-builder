import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Board, createBoard, type LevelBoard } from "@/lib/game/board";

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

/** Most boards are planned around level 8, so a fresh team (and a v1 single board) is a level 8 board. */
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
}

type PersistedState = Pick<BuilderState, "teams" | "saved">;

interface PersistedV1 {
  boards?: Record<number, Board>;
  saved?: { id: string; name: string; set: number; board: Board; savedAt: string }[];
}

export function migrateV1({ boards = {}, saved = [] }: PersistedV1): PersistedState {
  return {
    teams: Object.fromEntries(
      Object.entries(boards).map(([set, board]) => [set, teamOf([{ level: DEFAULT_LEVEL, board }])]),
    ),
    saved: saved.map(({ board, ...team }) => ({ ...team, boards: [{ level: DEFAULT_LEVEL, board }] })),
  };
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
    }),
    {
      name: "tfteam-builder",
      version: 2,
      partialize: ({ teams, saved }) => ({ teams, saved }),
      migrate: (persisted, version) =>
        version < 2 ? migrateV1(persisted as PersistedV1) : (persisted as PersistedState),
    },
  ),
);

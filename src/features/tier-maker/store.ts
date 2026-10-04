import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TierRows } from "@/content/types";
import type { MakerKind } from "./model";

const draftKey = (set: number, kind: MakerKind) => `${set}:${kind}`;

interface TierMakerState {
  /** Edited tier lists, by set and kind; a kind without a draft shows the site's current list. */
  drafts: Record<string, TierRows>;
  setDraft: (set: number, kind: MakerKind, rows: TierRows) => void;
  clearDraft: (set: number, kind: MakerKind) => void;
}

export const useTierMakerStore = create<TierMakerState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (setNumber, kind, rows) =>
        set((state) => ({ drafts: { ...state.drafts, [draftKey(setNumber, kind)]: rows } })),
      clearDraft: (setNumber, kind) =>
        set((state) => ({
          drafts: Object.fromEntries(Object.entries(state.drafts).filter(([key]) => key !== draftKey(setNumber, kind))),
        })),
    }),
    { name: "tfteam-tier-maker" },
  ),
);

export const useDraft = (set: number, kind: MakerKind) =>
  useTierMakerStore((state) => state.drafts[draftKey(set, kind)]);

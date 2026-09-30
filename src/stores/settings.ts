import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Patch } from "@/lib/data/schema";

interface SettingsState {
  patch: Patch;
  /** `null` follows the newest set available for the selected patch. */
  set: number | null;
  setPatch: (patch: Patch) => void;
  setSet: (set: number | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      patch: "latest",
      set: null,
      setPatch: (patch) => set({ patch }),
      setSet: (value) => set({ set: value }),
    }),
    { name: "tfteam-settings", version: 1 },
  ),
);

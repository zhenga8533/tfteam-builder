import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Patch } from "@/lib/data/schema";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

interface SettingsState {
  patch: Patch;
  /** "system" follows the operating system's light/dark preference. */
  theme: Theme;
  /** `null` follows the newest set available for the selected patch. */
  set: number | null;
  setPatch: (patch: Patch) => void;
  setSet: (set: number | null) => void;
  setTheme: (theme: Theme) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      patch: "latest",
      set: null,
      theme: "system",
      setPatch: (patch) => set({ patch }),
      setSet: (value) => set({ set: value }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "tfteam-settings", version: 1 },
  ),
);

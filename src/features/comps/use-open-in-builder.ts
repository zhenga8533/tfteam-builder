import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { compBoard } from "@/content";
import type { CompUnit } from "@/content/types";
import { teamOf, useBuilderStore } from "@/features/builder/store";

export interface CompLevel {
  level: number;
  units: CompUnit[];
}

/** Loads a comp's boards into the Team Builder for its set and opens the builder. */
export function useOpenInBuilder() {
  const navigate = useNavigate();
  const setTeam = useBuilderStore((state) => state.setTeam);

  return (set: number, levels: CompLevel[], name: string) => {
    setTeam(set, teamOf(levels.map(({ level, units }) => ({ level, board: compBoard(units) }))));
    toast.success(`Loaded ${name} into the Team Builder.`);
    void navigate({ to: "/builder" });
  };
}

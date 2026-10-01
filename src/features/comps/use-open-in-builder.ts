import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { compBoard } from "@/content";
import type { CompUnit } from "@/content/types";
import { useBuilderStore } from "@/features/builder/store";

/** Loads a comp's board into the Team Builder for its set and opens the builder. */
export function useOpenInBuilder() {
  const navigate = useNavigate();
  const setBoard = useBuilderStore((state) => state.setBoard);

  return (set: number, units: CompUnit[], name: string) => {
    setBoard(set, compBoard(units));
    toast.success(`Loaded ${name} into the Team Builder.`);
    void navigate({ to: "/builder" });
  };
}

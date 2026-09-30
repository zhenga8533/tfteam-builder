import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { compBoard } from "@/content";
import type { Comp } from "@/content/types";
import { useBuilderStore } from "@/features/builder/store";

export function useOpenInBuilder() {
  const navigate = useNavigate();
  const setBoard = useBuilderStore((state) => state.setBoard);

  return (comp: Comp) => {
    setBoard(comp.set, compBoard(comp.board));
    toast.success(`Loaded ${comp.name} into the Team Builder.`);
    void navigate({ to: "/builder" });
  };
}

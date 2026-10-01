import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useActiveSet, useGameData } from "@/lib/data/hooks";
import { useSettings } from "@/stores/settings";
import { decodeShareCode } from "./share-link";
import { EMPTY_TEAM, teamOf, useBuilderStore } from "./store";

/**
 * Loads a `/builder?team=…` link into the builder, switching to the link's set first, then drops the
 * parameter so a refresh doesn't load it again. The previous team can be restored from the toast.
 */
export function useSharedTeam(code: string | undefined) {
  const navigate = useNavigate();
  const { set, sets } = useActiveSet();
  const { championsByApi } = useGameData();
  const setSet = useSettings((state) => state.setSet);
  const setTeam = useBuilderStore((state) => state.setTeam);
  // Effects run twice in development; a link must only load (and toast) once.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!code || handled.current === code) return;
    const clear = () => void navigate({ to: "/builder", search: {}, replace: true });

    const header = decodeShareCode(code, () => true);
    if (!header.ok || !sets.includes(header.set)) {
      handled.current = code;
      toast.error(header.ok ? `Set ${header.set} isn't available here.` : header.error);
      clear();
      return;
    }
    // Validate champions against the link's own set, so switch to it first.
    if (header.set !== set) {
      setSet(header.set === sets[0] ? null : header.set);
      return;
    }

    handled.current = code;
    const result = decodeShareCode(code, (apiName) => championsByApi.has(apiName));
    if (!result.ok) return;
    const previous = useBuilderStore.getState().teams[set] ?? EMPTY_TEAM;
    setTeam(set, teamOf(result.boards));
    toast.success("Loaded a shared team.", { action: { label: "Undo", onClick: () => setTeam(set, previous) } });
    clear();
  }, [code, set, sets, championsByApi, navigate, setSet, setTeam]);
}

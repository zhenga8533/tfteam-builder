import { useGameData } from "@/lib/data/hooks";
import { traitStyle } from "@/lib/game/traits";
import type { EntityOption } from "./entity-picker";
import { ChampionIcon, TraitIcon } from "./icons";

/** The set's champions as picker options with portraits; `only` limits them to these apiNames. */
export function useChampionOptions(only?: string[]): EntityOption[] {
  const { champions } = useGameData();
  return champions
    .filter((champion) => !only || only.includes(champion.apiName))
    .map((champion) => ({
      key: champion.apiName,
      label: champion.name,
      icon: <ChampionIcon champion={champion} />,
      hint: `${champion.cost}`,
    }));
}

/** The set's champion traits (not emblem-only ones) as picker options with their badges. */
export function useTraitOptions(): EntityOption[] {
  const { traits } = useGameData();
  return traits
    .filter((trait) => trait.source === "champion")
    .map((trait) => ({
      key: trait.apiName,
      label: trait.name,
      icon: <TraitIcon trait={trait} style={traitStyle(trait.breakpoints[0]?.style ?? 1)} />,
    }));
}

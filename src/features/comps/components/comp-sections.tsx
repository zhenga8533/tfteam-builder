import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import { TRAIT_TEXT } from "@/components/game/styles";
import type { CompUnit } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { useCompTraits } from "../use-comp-traits";
import { CarryBadge } from "./carry-badge";

export function CompTraits({ units }: { units: CompUnit[] }) {
  const traits = useCompTraits(units);
  return (
    <ul className="space-y-1.5">
      {traits.map(({ trait, count, style }) => (
        <li key={trait.apiName}>
          <span className="flex items-center gap-2">
            <TraitLink trait={trait} style={style} count={count} className="flex-1 text-sm" iconClassName="size-7" />
            <span className={cn("text-sm font-semibold tabular-nums", TRAIT_TEXT[style])}>{count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Carries({ units }: { units: CompUnit[] }) {
  const { championsByApi, itemsByApi } = useGameData();
  const carries = units.filter((unit) => unit.carry || (unit.items?.length ?? 0) > 0);
  return (
    <ul className="space-y-2">
      {carries.map((unit) => {
        const champion = championsByApi.get(unit.apiName);
        if (!champion) return null;
        return (
          <li key={unit.hex} className="flex items-center gap-3">
            <ChampionLink
              champion={champion}
              className="flex-1 text-sm font-medium"
              iconClassName="size-10"
              badge={unit.carry && <CarryBadge />}
            />
            <span className="flex gap-1">
              {(unit.items ?? []).map((apiName, index) => {
                const item = itemsByApi.get(apiName);
                return item ? <ItemLink key={index} item={item} label={null} iconClassName="size-8" /> : null;
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

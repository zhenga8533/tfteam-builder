import type { ReactNode } from "react";
import { ItemCard, TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompUnit } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { useCompTraits } from "../use-comp-traits";

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="font-display">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

export function CompTraits({ units }: { units: CompUnit[] }) {
  const traits = useCompTraits(units);
  return (
    <ul className="space-y-1.5">
      {traits.map(({ trait, count, style }) => (
        <li key={trait.apiName}>
          <GameHoverCard content={<TraitCard trait={trait} count={count} />} side="left">
            <span tabIndex={0} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2">
              <TraitIcon trait={trait} style={style} />
              <span className="flex-1 text-sm">{trait.name}</span>
              <span className={cn("text-sm font-semibold tabular-nums", TRAIT_TEXT[style])}>{count}</span>
            </span>
          </GameHoverCard>
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
            <ChampionIcon champion={champion} className={cn("size-10", unit.carry && "ring-primary")} />
            <span className="flex-1 truncate text-sm font-medium">{champion.name}</span>
            <span className="flex gap-1">
              {(unit.items ?? []).map((apiName, index) => {
                const item = itemsByApi.get(apiName);
                return item ? (
                  <GameHoverCard key={index} content={<ItemCard item={item} />} side="left">
                    <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2">
                      <ItemIcon item={item} className="size-8" />
                    </span>
                  </GameHoverCard>
                ) : null;
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

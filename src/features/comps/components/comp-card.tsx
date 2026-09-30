import { Link } from "@tanstack/react-router";
import { ChampionCard, TraitCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import type { Comp } from "@/content/types";
import { useGameData } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";
import { DIFFICULTY_TEXT } from "../styles";
import { useCompTraits } from "../use-comp-traits";
import { TrendBadge } from "./tier-badge";

export function CompCard({ comp }: { comp: Comp }) {
  const { championsByApi, itemsByApi } = useGameData();
  const traits = useCompTraits(comp.board);
  const units = comp.board
    .flatMap((unit) => {
      const champion = championsByApi.get(unit.apiName);
      return champion ? [{ unit, champion }] : [];
    })
    .sort((a, b) => a.champion.cost - b.champion.cost);

  return (
    <article className="relative rounded-lg border bg-card p-3 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/50">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display font-semibold">
          <Link
            to="/comps/$slug"
            params={{ slug: comp.slug }}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {comp.name}
          </Link>
        </h3>
        {comp.trend && <TrendBadge trend={comp.trend} />}
        <span className="ml-auto flex gap-3 text-xs text-muted-foreground">
          <span>{comp.playstyle}</span>
          <span className={DIFFICULTY_TEXT[comp.difficulty]}>{comp.difficulty}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ul className="flex flex-wrap gap-1.5" aria-label="Champions">
          {units.map(({ unit, champion }) => (
            <li key={unit.hex} className="relative z-10 flex w-11 flex-col items-center gap-0.5">
              <GameHoverCard content={<ChampionCard champion={champion} star={unit.star} />}>
                <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ChampionIcon champion={champion} className={cn("size-11", unit.carry && "ring-3 ring-primary")} />
                </span>
              </GameHoverCard>
              {unit.items && unit.items.length > 0 && (
                <span className="flex gap-px">
                  {unit.items.map((apiName, index) => {
                    const item = itemsByApi.get(apiName);
                    return item ? <ItemIcon key={index} item={item} className="size-3.5" title={item.name} /> : null;
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
        <ul className="relative z-10 flex flex-wrap gap-1" aria-label="Active traits">
          {traits.slice(0, 6).map(({ trait, count, style }) => (
            <li key={trait.apiName}>
              <GameHoverCard content={<TraitCard trait={trait} count={count} />}>
                <span tabIndex={0} className="relative block outline-none">
                  <TraitIcon trait={trait} style={style} />
                  <span className="absolute -right-1 -bottom-1 rounded bg-background px-0.5 text-[10px] font-semibold">
                    {count}
                  </span>
                </span>
              </GameHoverCard>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

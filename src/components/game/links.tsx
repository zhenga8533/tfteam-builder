import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Champion, Item, Trait } from "@/lib/data/schema";
import type { TraitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { ChampionCard, ItemCard, TraitCard } from "./cards";
import { GameHoverCard } from "./game-hover-card";
import { ChampionIcon, ItemIcon, TraitIcon } from "./icons";

interface LinkProps {
  /** Text after the icon; defaults to the name. Pass `null` for an icon-only link. */
  label?: ReactNode;
  className?: string;
  iconClassName?: string;
}

const LINK_CLASS =
  "inline-flex min-w-0 items-center gap-2 rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

/** A champion's icon and name, linking to its page, with its card on hover. */
export function ChampionLink({
  champion,
  label,
  className,
  iconClassName = "size-7",
}: LinkProps & { champion: Champion }) {
  return (
    <GameHoverCard content={<ChampionCard champion={champion} />}>
      <Link to="/champions/$apiName" params={{ apiName: champion.apiName }} className={cn(LINK_CLASS, className)}>
        <ChampionIcon champion={champion} className={iconClassName} />
        {label !== null && <span className="truncate">{label ?? champion.name}</span>}
      </Link>
    </GameHoverCard>
  );
}

/** An item's icon and name, linking to its page, with its card on hover. */
export function ItemLink({ item, label, className, iconClassName = "size-7" }: LinkProps & { item: Item }) {
  return (
    <GameHoverCard content={<ItemCard item={item} />}>
      <Link to="/items/$apiName" params={{ apiName: item.apiName }} className={cn(LINK_CLASS, className)}>
        <ItemIcon item={item} className={iconClassName} />
        {label !== null && <span className="truncate">{label ?? item.name}</span>}
      </Link>
    </GameHoverCard>
  );
}

/** A trait's badge and name, linking to its page, with its card (at `count` units) on hover. */
export function TraitLink({
  trait,
  style,
  count,
  label,
  className,
  iconClassName = "size-6",
}: LinkProps & { trait: Trait; style?: TraitStyle; count?: number }) {
  return (
    <GameHoverCard content={<TraitCard trait={trait} count={count} />}>
      <Link to="/traits/$apiName" params={{ apiName: trait.apiName }} className={cn(LINK_CLASS, className)}>
        <TraitIcon trait={trait} style={style} className={iconClassName} />
        {label !== null && <span className="truncate">{label ?? trait.name}</span>}
      </Link>
    </GameHoverCard>
  );
}

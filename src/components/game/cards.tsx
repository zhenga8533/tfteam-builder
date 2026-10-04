import { useMemo } from "react";
import { useGameData } from "@/lib/data/hooks";
import type { Augment, Champion, Item, Trait } from "@/lib/data/schema";
import { createResolver, formatNumber } from "@/lib/game/description";
import { activeBreakpointIndex, traitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { GameText } from "./game-text";
import { AugmentIcon, ChampionIcon, ItemIcon, TraitIcon } from "./icons";
import { StatIcon } from "./stat-icon";
import type { Stat } from "./stats";
import { AUGMENT_TIER_LABEL, AUGMENT_TIER_TEXT, COST_TEXT, TRAIT_TEXT } from "./styles";

function CardHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="min-w-0">
        <p className="truncate font-display font-semibold">{title}</p>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

const CHAMPION_STATS: { stat: Stat; label: string; value: (champion: Champion) => string }[] = [
  { stat: "health", label: "Health", value: (c) => formatNumber(c.stats.hp) },
  { stat: "mana", label: "Mana", value: (c) => `${c.stats.initialMana}/${c.stats.mana}` },
  { stat: "damage", label: "Attack Damage", value: (c) => formatNumber(c.stats.damage) },
  { stat: "attackSpeed", label: "Attack Speed", value: (c) => c.stats.attackSpeed.toFixed(2) },
  { stat: "armor", label: "Armor", value: (c) => formatNumber(c.stats.armor) },
  { stat: "magicResist", label: "Magic Resist", value: (c) => formatNumber(c.stats.magicResist) },
  { stat: "critChance", label: "Crit Chance", value: (c) => `${Math.round(c.stats.critChance * 100)}%` },
  { stat: "range", label: "Range", value: (c) => formatNumber(c.stats.range) },
];

export function ChampionStats({ champion, className }: { champion: Champion; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-4 gap-x-3 gap-y-1.5 text-xs", className)}>
      {CHAMPION_STATS.map(({ stat, label, value }) => (
        <div key={stat} className="flex items-center gap-1" title={label}>
          <dt>
            <StatIcon stat={stat} />
            <span className="sr-only">{label}</span>
          </dt>
          <dd className="tabular-nums">{value(champion)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The ability's name and description, with values for `star` (all star levels when unset). */
export function ChampionAbility({
  champion,
  resolve,
  star,
}: {
  champion: Champion;
  resolve: ReturnType<typeof createResolver>;
  star?: number;
}) {
  if (!champion.ability.name) return null;
  return (
    <div className="space-y-1 border-t pt-3">
      <p className="text-sm font-semibold">{champion.ability.name}</p>
      <GameText desc={champion.ability.desc} resolve={resolve} star={star} className="text-xs" />
    </div>
  );
}

export function ChampionTraitList({ champion }: { champion: Champion }) {
  const { traitsByApi } = useGameData();
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {champion.traits.flatMap((apiName) => {
        const trait = traitsByApi.get(apiName);
        return trait
          ? [
              <span key={apiName} className="flex items-center gap-1 text-xs">
                <TraitIcon trait={trait} className="size-5" decorative />
                {trait.name}
              </span>,
            ]
          : [];
      })}
    </div>
  );
}

export function ChampionCard({ champion, star }: { champion: Champion; star?: number }) {
  const resolve = useMemo(() => createResolver(champion.ability.variables), [champion]);
  return (
    <div className="space-y-3">
      <CardHeading
        icon={<ChampionIcon champion={champion} decorative className="size-12" />}
        title={champion.name}
        subtitle={
          <span className={COST_TEXT[champion.cost]}>
            {champion.cost} cost
            {champion.role && <span className="text-muted-foreground"> · {champion.role}</span>}
          </span>
        }
      />
      <ChampionTraitList champion={champion} />
      <ChampionAbility champion={champion} resolve={resolve} star={star} />
      <ChampionStats champion={champion} className="border-t pt-3" />
    </div>
  );
}

export function ItemRecipe({ item }: { item: Item }) {
  const { itemsByApi } = useGameData();
  const parts = item.composition.flatMap((apiName) => itemsByApi.get(apiName) ?? []);
  if (parts.length === 0) return null;
  return (
    <span className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">+</span>}
          <ItemIcon item={part} className="size-5" title={part.name} />
        </span>
      ))}
    </span>
  );
}

export function ItemCard({ item }: { item: Item }) {
  const resolve = useMemo(() => createResolver(item.effects), [item]);
  return (
    <div className="space-y-3">
      <CardHeading
        icon={<ItemIcon item={item} decorative className="size-10" />}
        title={item.name}
        subtitle={<ItemRecipe item={item} />}
      />
      <GameText desc={item.desc} resolve={resolve} className="text-xs" />
    </div>
  );
}

export function AugmentCard({ augment }: { augment: Augment }) {
  const resolve = useMemo(() => createResolver(augment.effects), [augment]);
  return (
    <div className="space-y-3">
      <CardHeading
        icon={<AugmentIcon augment={augment} decorative className="size-10" />}
        title={augment.name}
        subtitle={<span className={AUGMENT_TIER_TEXT[augment.tier]}>{AUGMENT_TIER_LABEL[augment.tier]}</span>}
      />
      <GameText desc={augment.desc} resolve={resolve} className="text-xs" />
    </div>
  );
}

/** Splits a trait description into its intro and one row per breakpoint, each resolved with that breakpoint's variables. */
function splitTraitDescription(trait: Trait) {
  const rows = [...trait.desc.matchAll(/<(row|expandRow)>([\s\S]*?)<\/\1>/g)].map((match) => match[2] ?? "");
  const intro = trait.desc.replace(/<(row|expandRow)>[\s\S]*?<\/\1>/g, "");
  return { intro, rows };
}

export function TraitCard({ trait, count }: { trait: Trait; count?: number }) {
  const { intro, rows } = useMemo(() => splitTraitDescription(trait), [trait]);
  const activeIndex = count === undefined ? -1 : activeBreakpointIndex(trait, count);
  const firstBreakpoint = trait.breakpoints[0];

  return (
    <div className="space-y-3">
      <CardHeading
        icon={
          <TraitIcon
            trait={trait}
            style={firstBreakpoint ? traitStyle(firstBreakpoint.style) : "inactive"}
            className="size-9"
          />
        }
        title={trait.name}
        subtitle={trait.breakpoints.map((breakpoint) => breakpoint.minUnits).join(" / ")}
      />
      <GameText desc={intro} resolve={createResolver(firstBreakpoint?.variables ?? {})} className="text-xs" />
      {rows.length > 0 && (
        <ul className="space-y-1.5">
          {trait.breakpoints.map((breakpoint, index) => {
            const row = rows[index];
            if (row === undefined) return null;
            const style = traitStyle(breakpoint.style);
            return (
              <li
                key={index}
                className={cn(
                  "flex gap-2 rounded-md px-2 py-1 text-xs",
                  index === activeIndex ? "bg-accent" : count !== undefined && "opacity-60",
                )}
              >
                <span className={cn("font-semibold tabular-nums", TRAIT_TEXT[style])}>{breakpoint.minUnits}</span>
                <GameText
                  desc={row.replace(/^\s*\(@MinUnits@\)\s*/i, "")}
                  resolve={createResolver(breakpoint.variables, { MinUnits: breakpoint.minUnits })}
                  className="text-xs"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

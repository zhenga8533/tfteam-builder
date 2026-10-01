import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import type { Comp, CompUnit } from "@/content/types";
import { StatSummary } from "@/features/stats/components/stat-summary";
import { useGameData } from "@/lib/data/hooks";
import type { AutoComp } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { autoCompUnits } from "../auto-place";
import { DIFFICULTY_TEXT } from "../styles";
import { useCompTraits } from "../use-comp-traits";
import { TrendBadge } from "./tier-badge";

interface CompCardViewProps {
  title: string;
  link: Pick<LinkProps, "to" | "params">;
  units: CompUnit[];
  badge?: ReactNode;
  meta?: ReactNode;
}

/** A comp's name, champions (carries ringed, with items) and top traits; the whole card links to it. */
function CompCardView({ title, link, units: board, badge, meta }: CompCardViewProps) {
  const { championsByApi, itemsByApi } = useGameData();
  const traits = useCompTraits(board);
  const units = board
    .flatMap((unit) => {
      const champion = championsByApi.get(unit.apiName);
      return champion ? [{ unit, champion }] : [];
    })
    .sort((a, b) => a.champion.cost - b.champion.cost);

  return (
    <article className="relative rounded-lg border bg-card p-3 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/50">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display font-semibold">
          <Link {...link} className="outline-none after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        </h3>
        {badge}
        <span className="ml-auto flex gap-3 text-xs text-muted-foreground">{meta}</span>
      </div>
      <div className="space-y-2.5">
        <ul className="flex flex-wrap gap-1.5" aria-label="Champions">
          {units.map(({ unit, champion }) => (
            <li key={unit.hex} className="relative z-10 flex w-11 flex-col items-center gap-0.5">
              <ChampionLink
                champion={champion}
                label={null}
                iconClassName={cn("size-11", unit.carry && "ring-3 ring-primary")}
              />
              {unit.items && unit.items.length > 0 && (
                <span className="flex gap-px">
                  {unit.items.map((apiName, index) => {
                    const item = itemsByApi.get(apiName);
                    return item ? <ItemLink key={index} item={item} label={null} iconClassName="size-3.5" /> : null;
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
        <ul className="relative z-10 flex flex-wrap gap-1" aria-label="Active traits">
          {traits.slice(0, 6).map(({ trait, count, style }) => (
            <li key={trait.apiName}>
              <span className="relative block">
                <TraitLink trait={trait} style={style} count={count} label={null} iconClassName="size-7" />
                <span className="pointer-events-none absolute -right-1 -bottom-1 rounded bg-background px-0.5 text-[10px] font-semibold">
                  {count}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** A hand-written comp guide. */
export function CompCard({ comp }: { comp: Comp }) {
  return (
    <CompCardView
      title={comp.name}
      link={{ to: "/comps/$slug", params: { slug: comp.slug } }}
      units={comp.board}
      badge={comp.trend && <TrendBadge trend={comp.trend} />}
      meta={
        <>
          <span>{comp.playstyle}</span>
          <span className={DIFFICULTY_TEXT[comp.difficulty]}>{comp.difficulty}</span>
        </>
      }
    />
  );
}

/** A comp detected from match data, with its placement stats. */
export function AutoCompCard({ comp }: { comp: AutoComp }) {
  const { championsByApi } = useGameData();
  return (
    <CompCardView
      title={comp.name}
      link={{ to: "/comps/auto/$id", params: { id: comp.id } }}
      units={autoCompUnits(comp, championsByApi)}
      meta={<StatSummary line={comp} />}
    />
  );
}

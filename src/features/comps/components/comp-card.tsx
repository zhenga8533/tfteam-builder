import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import type { Comp, CompUnit } from "@/content/types";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { count, percent } from "@/features/stats/format";
import { useGameData } from "@/lib/data/hooks";
import type { AutoComp, StatLine } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { autoCompUnits } from "../auto-place";
import { DIFFICULTY_TEXT } from "../styles";
import { useCompTraits } from "../use-comp-traits";
import { TrendBadge } from "./tier-badge";

const MAX_TRAITS = 8;

interface CompCardViewProps {
  title: string;
  link: Pick<LinkProps, "to" | "params">;
  units: CompUnit[];
  badge?: ReactNode;
  /** The right-hand column: placement stats, or a guide's playstyle and difficulty. */
  aside: ReactNode;
}

/** Placement stats in a fixed column, so they line up from card to card. */
function CompStats({ line }: { line: StatLine }) {
  const rows = [
    ["Top 4", percent(line.top4)],
    ["Win", percent(line.win)],
    ["Games", count(line.games)],
  ];
  return (
    <>
      <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-center sm:gap-0.5">
        <AvgPlacement line={line} className="font-display text-2xl leading-none" />
        <span className="text-[11px] text-muted-foreground">avg place</span>
      </div>
      <dl className="flex gap-3 text-xs sm:flex-col sm:gap-0.5 sm:border-t sm:pt-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * A comp's name, champions (carries first and ringed, with their items) and main traits, with stats in
 * a column on the right; the whole card links to the comp.
 */
function CompCardView({ title, link, units: board, badge, aside }: CompCardViewProps) {
  const { championsByApi, itemsByApi } = useGameData();
  const traits = useCompTraits(board)
    .filter(({ style }) => style !== "inactive")
    .slice(0, MAX_TRAITS);
  const units = board
    .flatMap((unit) => {
      const champion = championsByApi.get(unit.apiName);
      return champion ? [{ unit, champion }] : [];
    })
    .sort((a, b) => Number(Boolean(b.unit.carry)) - Number(Boolean(a.unit.carry)) || a.champion.cost - b.champion.cost);

  return (
    <article className="relative flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/50 sm:flex-row sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display font-semibold">
            <Link {...link} className="outline-none after:absolute after:inset-0 after:content-['']">
              {title}
            </Link>
          </h3>
          {badge}
        </div>
        <ul className="flex flex-wrap items-start gap-1.5" aria-label="Champions">
          {units.map(({ unit, champion }) => (
            // Carries are larger so a full board still fits on one line.
            <li
              key={unit.hex}
              className={cn("relative z-10 flex flex-col items-center gap-1", unit.carry ? "w-12" : "w-10")}
            >
              <ChampionLink
                champion={champion}
                label={null}
                iconClassName={unit.carry ? "size-12 ring-3 ring-primary" : "size-10"}
              />
              {unit.items && unit.items.length > 0 && (
                <span className="flex">
                  {unit.items.map((apiName, index) => {
                    const item = itemsByApi.get(apiName);
                    return item ? (
                      <ItemLink
                        key={index}
                        item={item}
                        label={null}
                        iconClassName={unit.carry ? "size-4" : "size-[13px]"}
                      />
                    ) : null;
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
        <ul className="relative z-10 flex flex-wrap gap-x-3 gap-y-1" aria-label="Active traits">
          {traits.map(({ trait, count: units, style }) => (
            <li key={trait.apiName}>
              <TraitLink
                trait={trait}
                style={style}
                count={units}
                // A unique trait's count is always 1, so its badge stands alone.
                label={style === "unique" ? null : <span className="font-semibold tabular-nums">{units}</span>}
                className="gap-1 text-sm"
                iconClassName="size-6"
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 sm:w-24 sm:shrink-0 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-center sm:gap-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
        {aside}
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
      aside={
        <>
          <span className="text-sm font-medium sm:text-center">{comp.playstyle}</span>
          <span className={cn("text-xs sm:text-center", DIFFICULTY_TEXT[comp.difficulty])}>{comp.difficulty}</span>
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
      aside={<CompStats line={comp} />}
    />
  );
}

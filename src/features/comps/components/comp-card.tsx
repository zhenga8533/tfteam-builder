import { Link, type LinkProps } from "@tanstack/react-router";
import { memo, type ReactNode } from "react";
import { ItemCard } from "@/components/game/cards";
import { GameHoverCard } from "@/components/game/game-hover-card";
import { ItemIcon } from "@/components/game/icons";
import { ChampionLink, TraitLink } from "@/components/game/links";
import type { Comp, CompUnit, Tier } from "@/content/types";
import { TrendBadge } from "@/features/stats/components/patch-trend";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { count, percent, share } from "@/features/stats/format";
import type { CompSort } from "@/features/stats/sort";
import { useCompTrendPatch, useGameData } from "@/lib/data/hooks";
import type { AutoComp, RankFloor, StatLine } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { DIFFICULTY_TEXT } from "../styles";
import { useAutoCompUnits } from "../use-auto-comp-units";
import { useCompTraits } from "../use-comp-traits";
import { GuideTrendBadge, TierBadge } from "./tier-badge";

const MAX_TRAITS = 8;

interface CompCardViewProps {
  title: string;
  /** Where the card leads; a preview (e.g. in the guide editor) has none. */
  link?: Pick<LinkProps, "to" | "params" | "search">;
  units: CompUnit[];
  badge?: ReactNode;
  /** Shown before the title when the card isn't in a tier row. */
  tier?: Tier;
  /** The right-hand column: placement stats, or a guide's playstyle and difficulty. */
  aside: ReactNode;
}

/**
 * Placement stats in a column as wide as they are: the average, then the rest in a grid, kept shorter than the board
 * beside it.
 */
function CompStats({ line, sort }: { line: StatLine; sort?: CompSort }) {
  const rows = [
    { key: "top4", label: "Top 4", value: percent(line.top4) },
    { key: "win", label: "Win", value: percent(line.win) },
    { key: "play", label: "Play", value: share(line.play) },
    { key: "games", label: "Games", value: count(line.games) },
  ];
  return (
    <>
      <div className="flex items-baseline gap-1.5" title="Average placement">
        <AvgPlacement line={line} className="font-display text-xl leading-none" />
        <span className="text-[11px] text-muted-foreground">avg</span>
      </div>
      <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs sm:grid-cols-[auto_auto] sm:gap-x-4 sm:border-t sm:pt-2">
        {rows.map(({ key, label, value }) => (
          <div
            key={key}
            className={cn("whitespace-nowrap", key === sort && "-mx-1 rounded bg-muted px-1 ring-1 ring-border")}
          >
            <dt className="text-[10px] text-muted-foreground">{label}</dt>
            <dd className={cn("tabular-nums", key === sort ? "font-semibold" : "font-medium")}>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * A comp's name, champions (carries first and larger, with their items) and main traits, with stats in
 * a column on the right; the whole card links to the comp.
 */
function CompCardView({ title, link, units: board, badge, tier, aside }: CompCardViewProps) {
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
    <article
      className={cn(
        // Off-screen cards skip rendering until scrolled near. Per card rather than per tier row: cards are of similar
        // height, so the placeholder size keeps the page's height (and scrollbar) close to right.
        "relative flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors [contain-intrinsic-size:auto_10rem] [content-visibility:auto] focus-within:ring-2 focus-within:ring-ring sm:flex-row sm:gap-4",
        link && "hover:border-primary/50",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {tier && <TierBadge tier={tier} className="size-6 rounded-md text-sm" />}
          <h3 className="font-display font-semibold">
            {link ? (
              <Link
                {...link}
                className="inline-flex min-h-6 items-center outline-none after:absolute after:inset-0 after:content-['']"
              >
                {title}
              </Link>
            ) : (
              title
            )}
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
              <ChampionLink champion={champion} label={null} iconClassName={unit.carry ? "size-12" : "size-10"} />
              {unit.items && unit.items.length > 0 && (
                // Too small to be good touch targets, so they're images with hover cards rather than links; the
                // comp's page lists the same items larger.
                <span className="flex">
                  {unit.items.map((apiName, index) => {
                    const item = itemsByApi.get(apiName);
                    return item ? (
                      <GameHoverCard key={index} content={<ItemCard item={item} />}>
                        <span className="flex">
                          <ItemIcon item={item} className={unit.carry ? "size-4" : "size-[13px]"} />
                        </span>
                      </GameHoverCard>
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 sm:w-auto sm:min-w-24 sm:shrink-0 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-center sm:gap-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
        {aside}
      </div>
    </article>
  );
}

/** A hand-written comp guide. */
export const CompCard = memo(function CompCard({ comp, preview = false }: { comp: Comp; preview?: boolean }) {
  return (
    <CompCardView
      title={comp.name}
      link={preview ? undefined : { to: "/comps/$slug", params: { slug: comp.slug } }}
      units={comp.board}
      badge={comp.trend && <GuideTrendBadge trend={comp.trend} />}
      aside={
        <>
          <span className="text-sm font-medium sm:text-center">{comp.playstyle}</span>
          <span className={cn("text-xs sm:text-center", DIFFICULTY_TEXT[comp.difficulty])}>{comp.difficulty}</span>
        </>
      }
    />
  );
});

/** A comp detected from match data, with its placement stats. */
export const AutoCompCard = memo(function AutoCompCard({
  comp,
  rank,
  patch,
  sort,
}: {
  comp: AutoComp;
  rank?: RankFloor;
  /** Another of the set's patches the comp is from. */
  patch?: string;
  /** The stat the list is ranked by: the card shows the comp's tier and highlights that stat. */
  sort?: CompSort;
}) {
  const trendPatch = useCompTrendPatch(rank, patch);
  // Stable across renders, so the card's trait calculation (memoized on the units) isn't redone each time.
  const { units } = useAutoCompUnits(comp);
  return (
    <CompCardView
      title={comp.name}
      link={{ to: "/comps/auto/$id", params: { id: comp.id }, search: { rank, patch } }}
      units={units}
      // In the title row, where guide cards show their trend.
      badge={
        <TrendBadge delta={comp.trend} patch={trendPatch} className="rounded-full px-1.5 py-0.5 ring-1 ring-border" />
      }
      tier={sort && (comp.tier ?? "C")}
      aside={<CompStats line={comp} sort={sort} />}
    />
  );
});

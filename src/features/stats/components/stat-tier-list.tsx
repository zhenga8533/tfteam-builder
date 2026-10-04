import { Pin } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import type { TierRows } from "@/content/types";
import { TierRows as TierRowsView } from "@/features/comps/components/tier-rows";
import { useStats } from "@/lib/data/hooks";
import type { RankFloor, SetStats, StatLine } from "@/lib/data/schema";
import { tierListRows } from "../tiers";
import type { Region } from "@/lib/data/constants";
import { useRankChoice, useRegionChoice } from "../use-scope-choices";
import { NoStats } from "./no-stats";
import { StatsMeta } from "./stats-meta";

interface StatTierListProps {
  title: string;
  /** What the list ranks, plural, for the no-matches message ("champions"). */
  entries: string;
  description: string;
  /** Entries from the stats file, keyed the same way as `overrides`. */
  lines: [key: string, line: StatLine][];
  /** Entries placed by hand over their stats-based tier; they're marked with a pin. */
  overrides?: TierRows;
  /** A hand-written list shown instead while there are no stats. */
  fallback?: TierRows;
  renderEntry: (key: string, line: StatLine | undefined) => ReactNode;
  /** Filter controls shown above the tiers. */
  toolbar?: ReactNode;
  /** Whether an entry passes the toolbar's filters; everything shows by default. */
  visible?: (key: string) => boolean;
  /** The stats `lines` come from, when they're for a chosen rank floor. */
  stats?: SetStats | null;
  /** The chosen rank floor and how to change it; the stats line offers floors that have their own stats. */
  rank?: { value?: RankFloor; onChange: (rank: RankFloor | undefined) => void };
  /** The chosen region and how to change it; regions have stats at the default floor only. */
  region?: { value?: Region; onChange: (region: Region | undefined) => void };
}

interface EntryListProps extends Pick<StatTierListProps, "renderEntry"> {
  keys: string[];
  lines: Map<string, StatLine>;
  pinned?: Set<string>;
}

const PINNED_HINT = "Placed in this tier by hand, not by stats";

function EntryList({ keys, renderEntry, lines, pinned }: EntryListProps) {
  return (
    <ul className="flex flex-wrap gap-3">
      {keys.map((key) => (
        <li key={key} className="relative">
          {renderEntry(key, lines.get(key))}
          {pinned?.has(key) && (
            <span
              className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs ring-1 ring-border"
              title={PINNED_HINT}
            >
              <Pin className="size-2.5" aria-hidden />
              <span className="sr-only">{PINNED_HINT}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * A tier list ranked by match stats, with hand-written overrides from `src/content` (pinned). Entries with too
 * few games for a tier (rare breakpoints such as prismatic traits) are listed after the tiers. Without stats it
 * shows the hand-written fallback list, if there is one.
 */
export function StatTierList({
  title,
  entries,
  description,
  lines,
  overrides = {},
  fallback = {},
  renderEntry,
  toolbar,
  visible = () => true,
  stats: shownStats,
  rank,
  region,
}: StatTierListProps) {
  const base = useStats();
  const stats = shownStats === undefined ? base : shownStats;
  const rankChoice = useRankChoice((value) => rank?.onChange(value));
  const regionChoice = useRegionChoice(region?.value, (value) => region?.onChange(value));
  const shown = lines.filter(([key]) => visible(key));
  const byKey = new Map(shown);
  const onlyVisible = (rows: TierRows) =>
    Object.fromEntries(Object.entries(rows).map(([tier, keys]) => [tier, keys.filter(visible)])) as TierRows;
  const generated = [...shown]
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([key, line]) => ({ key, tier: line.tier }));
  const {
    rows,
    pinned: overridden,
    usingFallback,
  } = tierListRows({
    generated,
    hasStats: lines.length > 0,
    overrides: onlyVisible(overrides),
    fallback: onlyVisible(fallback),
  });
  const lowSample = generated.filter((entry) => !entry.tier && !overridden.has(entry.key)).map((entry) => entry.key);
  const hasStats = lines.length > 0 || usingFallback;
  const showsPins = Object.values(rows).some((keys) => keys.some((key) => overridden.has(key)));

  return (
    <>
      <PageHeader title={title} description={description} />
      {stats && (
        <StatsMeta stats={stats} rank={rank ? rankChoice : undefined} region={region ? regionChoice : undefined} />
      )}
      {toolbar && <div className="mb-6 flex flex-wrap items-center gap-2">{toolbar}</div>}
      {!hasStats ? (
        <NoStats />
      ) : Object.keys(rows).length === 0 && lowSample.length === 0 ? (
        <EmptyState>No {entries} match these filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          <TierRowsView
            rows={rows}
            renderRow={(keys) => <EntryList keys={keys} lines={byKey} renderEntry={renderEntry} pinned={overridden} />}
          />
          {usingFallback && (
            <p className="text-xs text-muted-foreground">
              Hand-picked tiers: there are no match stats to rank these by.
            </p>
          )}
          {showsPins && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Pin className="size-3" aria-hidden /> {PINNED_HINT}.
            </p>
          )}
          {lowSample.length > 0 && (
            <section aria-label="Low sample" className="rounded-xl border border-dashed p-3 opacity-80">
              <h2 className="mb-1 text-sm font-semibold">Low sample</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Too few games to rank yet; their averages can still change a lot.
              </p>
              <EntryList keys={lowSample} lines={byKey} renderEntry={renderEntry} />
            </section>
          )}
        </div>
      )}
    </>
  );
}

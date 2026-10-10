import { Pin } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import type { Tier, TierRows } from "@/content/types";
import { TierBadge } from "@/features/comps/components/tier-badge";
import { TierRows as TierRowsView } from "@/features/comps/components/tier-rows";
import type { RankFloor, SetStats, StatLine } from "@/lib/data/schema";
import { rankByStat, STAT_SORT_LABELS, type StatSort } from "../sort";
import { tierListRows } from "../tiers";
import { NoStats } from "./no-stats";
import { StatSortFilter } from "./stat-sort-filter";
import { type PatchChoice, type RegionChoice, StatsMeta } from "./stats-meta";

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
  /** Renders an entry; with `sort`, it shows that stat in place of its average placement. */
  renderEntry: (key: string, line: StatLine | undefined, sort?: StatSort) => ReactNode;
  /** Filter controls shown above the tiers. */
  toolbar?: ReactNode;
  /** Whether an entry passes the toolbar's filters; everything shows by default. */
  visible?: (key: string) => boolean;
  /** The stats `lines` come from: the default ones, or a chosen rank floor's, region's or patch's. */
  stats: SetStats | null;
  /** How to change the rank floor; the stats line offers floors that have their own stats. */
  rank?: { onChange: (rank: RankFloor | undefined) => void };
  /** How to change the region; regions have stats at the default floor only. */
  region?: RegionChoice;
  /** How to change the patch, among the set's patches with their own stats. */
  patch?: PatchChoice;
  /** The stat to rank by in a single list instead of tiers, and how to change it. */
  sort?: { value?: StatSort; onChange: (sort?: StatSort) => void };
}

interface EntryListProps extends Pick<StatTierListProps, "renderEntry"> {
  keys: string[];
  lines: Map<string, StatLine>;
  pinned?: Set<string>;
  /** Each entry's tier, shown on its corner when the list isn't laid out in tiers. */
  tiers?: Map<string, Tier>;
  sort?: StatSort;
}

const PINNED_HINT = "Placed in this tier by hand, not by stats";

function EntryList({ keys, renderEntry, lines, pinned, tiers, sort }: EntryListProps) {
  return (
    <ul className="flex flex-wrap gap-3">
      {keys.map((key) => (
        <li key={key} className="relative">
          {renderEntry(key, lines.get(key), sort)}
          {tiers?.has(key) && (
            <TierBadge
              tier={tiers.get(key)!}
              className="pointer-events-none absolute -top-1 -left-1 size-4 rounded text-[10px] shadow-xs"
            />
          )}
          {pinned?.has(key) && (
            <span
              className="pointer-events-none absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs ring-1 ring-border"
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
  stats,
  rank,
  region,
  patch,
  sort,
}: StatTierListProps) {
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
  // A hand-picked fallback has no stats to rank by.
  const sortBy = usingFallback ? undefined : sort?.value;
  const tiers = new Map(
    Object.entries(rows).flatMap(([tier, keys]) =>
      keys.filter((key) => byKey.has(key)).map((key) => [key, tier as Tier]),
    ),
  );
  const ranked = sortBy && { sort: sortBy, keys: rankByStat([...tiers.keys()], (key) => byKey.get(key)!, sortBy) };

  return (
    <>
      <PageHeader title={title} description={description} />
      {stats && <StatsMeta stats={stats} onRankChange={rank?.onChange} region={region} patch={patch} />}
      {(toolbar || sort) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {toolbar}
          {sort && lines.length > 0 && <StatSortFilter value={sort.value} onChange={sort.onChange} />}
        </div>
      )}
      {!hasStats ? (
        <NoStats />
      ) : Object.keys(rows).length === 0 && lowSample.length === 0 ? (
        <EmptyState>No {entries} match these filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          {ranked ? (
            ranked.keys.length > 0 && (
              <section
                aria-label={`By ${STAT_SORT_LABELS[ranked.sort].toLowerCase()}`}
                className="rounded-xl border bg-card/60 p-3"
              >
                <EntryList
                  keys={ranked.keys}
                  lines={byKey}
                  renderEntry={renderEntry}
                  tiers={tiers}
                  sort={ranked.sort}
                />
              </section>
            )
          ) : (
            <TierRowsView
              rows={rows}
              renderRow={(keys) => (
                <EntryList keys={keys} lines={byKey} renderEntry={renderEntry} pinned={overridden} />
              )}
            />
          )}
          {usingFallback && (
            <p className="text-xs text-muted-foreground">
              Hand-picked tiers: there are no match stats to rank these by.
            </p>
          )}
          {showsPins && !ranked && (
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
              <EntryList keys={lowSample} lines={byKey} renderEntry={renderEntry} sort={sortBy} />
            </section>
          )}
        </div>
      )}
    </>
  );
}

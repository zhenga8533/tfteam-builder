import type { ReactNode } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import type { TierRows } from "@/content/types";
import { TierRows as TierRowsView } from "@/features/comps/components/tier-rows";
import { useStats } from "@/lib/data/hooks";
import type { RankFloor, SetStats, StatLine } from "@/lib/data/schema";
import { mergeTiers } from "../tiers";
import { useRankChoice } from "../use-rank-choice";
import { NoStats } from "./no-stats";
import { StatsMeta } from "./stats-meta";

interface StatTierListProps {
  title: string;
  description: string;
  /** Entries from the stats file, keyed the same way as `overrides`. */
  lines: [key: string, line: StatLine][];
  overrides?: TierRows;
  renderEntry: (key: string, line: StatLine | undefined) => ReactNode;
  /** Filter controls shown above the tiers. */
  toolbar?: ReactNode;
  /** Whether an entry passes the toolbar's filters; everything shows by default. */
  visible?: (key: string) => boolean;
  /** The stats `lines` come from, when they're for a chosen rank floor. */
  stats?: SetStats | null;
  /** The chosen rank floor and how to change it; the stats line offers floors that have their own stats. */
  rank?: { value?: RankFloor; onChange: (rank: RankFloor | undefined) => void };
}

interface EntryListProps extends Pick<StatTierListProps, "renderEntry"> {
  keys: string[];
  lines: Map<string, StatLine>;
}

function EntryList({ keys, renderEntry, lines }: EntryListProps) {
  return (
    <ul className="flex flex-wrap gap-3">
      {keys.map((key) => (
        <li key={key}>{renderEntry(key, lines.get(key))}</li>
      ))}
    </ul>
  );
}

/**
 * A tier list ranked by match stats, with hand-written overrides from `src/content`. Entries with too
 * few games for a tier (rare breakpoints such as prismatic traits) are listed after the tiers.
 */
export function StatTierList({
  title,
  description,
  lines,
  overrides = {},
  renderEntry,
  toolbar,
  visible = () => true,
  stats: shownStats,
  rank,
}: StatTierListProps) {
  const base = useStats();
  const stats = shownStats === undefined ? base : shownStats;
  const rankChoice = useRankChoice((value) => rank?.onChange(value));
  const shown = lines.filter(([key]) => visible(key));
  const byKey = new Map(shown);
  const overridden = new Set(Object.values(overrides).flat());
  const generated = [...shown]
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([key, line]) => ({ key, tier: line.tier }));
  const visibleOverrides = Object.fromEntries(
    Object.entries(overrides).map(([tier, keys]) => [tier, keys.filter(visible)]),
  ) as TierRows;
  const rows = mergeTiers(generated, visibleOverrides);
  const lowSample = generated.filter((entry) => !entry.tier && !overridden.has(entry.key)).map((entry) => entry.key);
  const hasStats = lines.length > 0 || Object.keys(overrides).length > 0;

  return (
    <>
      <PageHeader title={title} description={description} />
      {stats && <StatsMeta stats={stats} rank={rank ? rankChoice : undefined} />}
      {toolbar && <div className="mb-6 flex flex-wrap items-center gap-2">{toolbar}</div>}
      {!hasStats ? (
        <NoStats />
      ) : Object.keys(rows).length === 0 && lowSample.length === 0 ? (
        <EmptyState>Nothing matches these filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          <TierRowsView
            rows={rows}
            renderRow={(keys) => <EntryList keys={keys} lines={byKey} renderEntry={renderEntry} />}
          />
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

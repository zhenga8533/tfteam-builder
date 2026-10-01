import type { ReactNode } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import type { TierRows } from "@/content/types";
import { TierRows as TierRowsView } from "@/features/comps/components/tier-rows";
import { useActiveSet, useStats } from "@/lib/data/hooks";
import type { StatLine } from "@/lib/data/schema";
import { mergeTiers } from "../tiers";
import { StatsMeta } from "./stats-meta";

interface StatTierListProps {
  title: string;
  description: string;
  /** Entries from the stats file, keyed the same way as `overrides`. */
  lines: [key: string, line: StatLine][];
  overrides?: TierRows;
  renderEntry: (key: string, line: StatLine | undefined) => ReactNode;
}

/** A tier list ranked by match stats, with hand-written overrides from `src/content`. */
export function StatTierList({ title, description, lines, overrides, renderEntry }: StatTierListProps) {
  const { patch, set } = useActiveSet();
  const stats = useStats();
  const byKey = new Map(lines);
  const generated = [...lines]
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([key, line]) => ({ key, tier: line.tier }));
  const rows = mergeTiers(generated, overrides);

  return (
    <>
      <PageHeader title={title} description={description} />
      {stats && <StatsMeta stats={stats} />}
      {Object.keys(rows).length === 0 ? (
        <EmptyState>
          {patch === "pbe"
            ? "Match stats come from live ranked games, so they aren't available on PBE."
            : `No match stats for Set ${set} yet.`}
        </EmptyState>
      ) : (
        <TierRowsView
          rows={rows}
          renderRow={(keys) => (
            <ul className="flex flex-wrap gap-3">
              {keys.map((key) => (
                <li key={key}>{renderEntry(key, byKey.get(key))}</li>
              ))}
            </ul>
          )}
        />
      )}
    </>
  );
}

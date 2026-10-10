import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { TraitCard } from "@/components/game/cards";
import { ChampionLink } from "@/components/game/links";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DatabaseSortFilter } from "@/features/stats/components/stat-sort";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { type DatabaseSort, orderEntries, parseDatabaseSort } from "@/features/stats/sort";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { percent } from "@/features/stats/format";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { TraitStat } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";
import { cn } from "@/lib/utils";

interface TraitSearch {
  q?: string;
  sort?: DatabaseSort;
}

export const Route = createFileRoute("/traits")({
  head: () => ({ meta: [{ title: "Traits · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): TraitSearch => ({
    q: stringParam(search.q),
    sort: parseDatabaseSort(search.sort),
  }),
  component: TraitsPage,
});

function TraitBreakpointStats({ lines }: { lines: TraitStat[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
      {[...lines]
        .sort((a, b) => a.minUnits - b.minUnits)
        .map((line) => (
          <li key={line.minUnits}>
            <span className="font-semibold text-foreground">{line.minUnits}</span> · <AvgPlacement line={line} /> avg ·{" "}
            {percent(line.top4)} top 4
          </li>
        ))}
    </ul>
  );
}

/**
 * A trait's breakpoints as one line to sort by. Its placement is its best breakpoint with enough games for a tier, as
 * on its own page; rarely reached top breakpoints would otherwise win on a handful of games. A player has at most one
 * active level of a trait, so its breakpoints' play rates add up to how often it's active at all.
 */
const traitLine = (lines: TraitStat[]) => ({
  score: lines.reduce((best, line) => (line.tier ? Math.min(best, line.score) : best), Infinity),
  play: lines.reduce((total, line) => total + line.play, 0),
});

function TraitsPage() {
  const { traits, champions } = useGameData();
  const stats = useStats();
  const { q, sort } = Route.useSearch();
  const update = useUpdateSearch<TraitSearch>();

  const sections = useMemo(() => {
    const found = traits.filter((trait) => matches(trait.name, q));
    const ordered =
      sort && stats?.status === "ready"
        ? orderEntries(found, (trait) => traitLine(stats.traits.filter((line) => line.trait === trait.apiName)), sort)
        : found;
    const withChampions = ordered.map((trait) => ({
      trait,
      champions: champions.filter((champion) => champion.traits.includes(trait.apiName)),
    }));
    type Entry = (typeof withChampions)[number];
    const fromChampions = (entry: Entry) => entry.trait.source === "champion";
    // Unique traits belong to a single champion and have a single breakpoint.
    const isUnique = (entry: Entry) => entry.champions.length <= 1;
    return [
      {
        title: "Traits",
        description: undefined,
        entries: withChampions.filter((e) => fromChampions(e) && !isUnique(e)),
      },
      {
        title: "Unique traits",
        description: undefined,
        entries: withChampions.filter((e) => fromChampions(e) && isUnique(e)),
      },
      {
        title: "Other traits",
        description: "Granted by augments, champion forms or set mechanics rather than by shop champions.",
        entries: withChampions.filter((e) => !fromChampions(e)),
      },
    ].filter((section) => section.entries.length > 0);
  }, [traits, champions, q, sort, stats]);

  return (
    <>
      <PageHeader title="Traits" description="Breakpoints, bonuses and the champions that carry each trait." />
      {stats && <StatsMeta stats={stats} />}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={q ?? ""}
          onChange={(value) => update({ q: value || undefined })}
          placeholder="Search traits"
        />
        {stats?.status === "ready" && (
          <DatabaseSortFilter defaultLabel="By name" value={sort} onChange={(next) => update({ sort: next })} />
        )}
      </div>
      {sections.length === 0 ? (
        <EmptyState>No traits match these filters.</EmptyState>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className={cn("font-display text-lg font-semibold", section.description ? "mb-1" : "mb-3")}>
                {section.title}
              </h2>
              {section.description && <p className="mb-3 text-sm text-muted-foreground">{section.description}</p>}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.entries.map(({ trait, champions: members }) => (
                  <Card key={trait.apiName} className="relative py-4 transition-colors hover:border-primary/50">
                    <CardContent className="space-y-3 px-4">
                      <Link
                        to="/traits/$apiName"
                        params={{ apiName: trait.apiName }}
                        className="block rounded-md outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <TraitCard trait={trait} />
                      </Link>
                      <TraitBreakpointStats
                        lines={stats?.traits.filter((line) => line.trait === trait.apiName) ?? []}
                      />
                      {members.length > 0 && (
                        <div className="relative z-10 flex flex-wrap gap-1.5 border-t pt-3">
                          {members.map((champion) => (
                            <ChampionLink
                              key={champion.apiName}
                              champion={champion}
                              label={null}
                              iconClassName="size-9"
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

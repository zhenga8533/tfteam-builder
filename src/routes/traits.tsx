import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { TraitCard } from "@/components/game/cards";
import { ChampionLink } from "@/components/game/links";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { percent } from "@/features/stats/format";
import { useGameData, useStats } from "@/lib/data/hooks";
import type { TraitStat } from "@/lib/data/schema";
import { matches, stringParam } from "@/lib/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/traits")({
  head: () => ({ meta: [{ title: "Traits · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({ q: stringParam(search.q) }),
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

function TraitsPage() {
  const { traits, champions } = useGameData();
  const stats = useStats();
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const sections = useMemo(() => {
    const withChampions = traits
      .filter((trait) => matches(trait.name, q))
      .map((trait) => ({ trait, champions: champions.filter((champion) => champion.traits.includes(trait.apiName)) }));
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
  }, [traits, champions, q]);

  return (
    <>
      <PageHeader title="Traits" description="Breakpoints, bonuses and the champions that carry each trait." />
      <div className="mb-6 flex">
        <SearchInput
          value={q ?? ""}
          onChange={(value) => navigate({ search: { q: value || undefined }, replace: true })}
          placeholder="Search traits"
        />
      </div>
      {sections.length === 0 ? (
        <EmptyState>No traits match "{q}".</EmptyState>
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

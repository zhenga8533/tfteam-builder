import { createFileRoute } from "@tanstack/react-router";
import { TraitCard } from "@/components/game/cards";
import { TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { parseStatsScope, scopeChoices, type StatsScope } from "@/features/stats/scope";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useTierStats } from "@/lib/data/hooks";
import { traitBreakpoint, traitKey, type TraitStyle, traitStyle } from "@/lib/game/traits";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, stringParam } from "@/lib/search";
import { cn } from "@/lib/utils";

const STYLES = ["bronze", "silver", "gold", "prismatic", "unique"] as const satisfies TraitStyle[];
type BreakpointStyle = (typeof STYLES)[number];

interface TraitTierSearch extends StatsScope {
  q?: string;
  style?: BreakpointStyle;
}

export const Route = createFileRoute("/tierlist/traits")({
  head: () => ({ meta: [{ title: "Trait Tier List · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): TraitTierSearch => ({
    ...parseStatsScope(search),
    q: stringParam(search.q),
    style: STYLES.includes(search.style as BreakpointStyle) ? (search.style as BreakpointStyle) : undefined,
  }),
  component: TraitTierListPage,
});

function TraitTierListPage() {
  const { set } = useActiveSet();
  const { traitsByApi } = useGameData();
  const search = Route.useSearch();
  const stats = useTierStats(search.rank, search.region);
  const lines = (stats?.traits ?? [])
    .filter((line) => traitsByApi.has(line.trait))
    .map((line) => [traitKey(line.trait, line.minUnits), line] as [string, typeof line]);
  const update = useUpdateSearch<TraitTierSearch>();
  const visible = (key: string) => {
    const found = traitBreakpoint(key, traitsByApi);
    return (
      !!found &&
      matches(found.trait.name, search.q) &&
      (!search.style || traitStyle(found.breakpoint.style) === search.style)
    );
  };

  return (
    <StatTierList
      title="Trait Tier List"
      entries="traits"
      description={`Set ${set} trait breakpoints ranked by average placement.`}
      lines={lines}
      overrides={tierListForSet(set)?.traits}
      fallback={tierListForSet(set)?.fallback?.traits}
      visible={visible}
      stats={stats}
      {...scopeChoices(search, update)}
      toolbar={
        <>
          <SearchInput
            value={search.q ?? ""}
            onChange={(q) => update({ q: q || undefined })}
            placeholder="Search traits"
          />
          <ToggleGroup
            type="single"
            variant="outline"
            value={search.style ?? ""}
            onValueChange={(style) => update({ style: (style as BreakpointStyle) || undefined })}
            className="flex-wrap"
            aria-label="Filter by breakpoint style"
          >
            {STYLES.map((style) => (
              <ToggleGroupItem key={style} value={style} className={cn("px-3 capitalize", TRAIT_TEXT[style])}>
                {style}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      }
      renderEntry={(key, line) => {
        const found = traitBreakpoint(key, traitsByApi);
        if (!found) return null;
        const { trait, breakpoint } = found;
        return (
          <TierEntry
            icon={<TraitIcon trait={trait} style={traitStyle(breakpoint.style)} decorative className="size-12" />}
            label={`${breakpoint.minUnits} ${trait.name}`}
            line={line}
            play="of boards"
            link={{ to: "/traits/$apiName", params: { apiName: trait.apiName } }}
            trend={<StatTrend kind="traits" entry={key} />}
            card={<TraitCard trait={trait} count={breakpoint.minUnits} />}
          />
        );
      }}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { TraitCard } from "@/components/game/cards";
import { TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { SearchInput } from "@/components/layout/search-input";
import { ChoiceFilter } from "@/components/game/choice-filter";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { parseStatSort, type StatSort } from "@/features/stats/sort";
import { parseStatsScope, scopeChoices, type StatsScope } from "@/features/stats/scope";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useTierStats } from "@/lib/data/hooks";
import { traitBreakpoint, traitKey, type TraitStyle, traitStyle } from "@/lib/game/traits";
import { useUpdateSearch } from "@/lib/use-update-search";
import { matches, oneOf, stringParam } from "@/lib/search";

const STYLES = ["bronze", "silver", "gold", "prismatic", "unique"] as const satisfies TraitStyle[];
type BreakpointStyle = (typeof STYLES)[number];
const STYLE_LABELS: Record<BreakpointStyle, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  prismatic: "Prismatic",
  unique: "Unique",
};

interface TraitTierSearch extends StatsScope {
  sort?: StatSort;
  q?: string;
  style?: BreakpointStyle;
}

export const Route = createFileRoute("/tierlist/traits")({
  head: () => ({ meta: [{ title: "Trait Tier List · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): TraitTierSearch => ({
    ...parseStatsScope(search),
    sort: parseStatSort(search.sort),
    q: stringParam(search.q),
    style: oneOf(STYLES, search.style),
  }),
  component: TraitTierListPage,
});

function TraitTierListPage() {
  const { set } = useActiveSet();
  const { traitsByApi } = useGameData();
  const search = Route.useSearch();
  const stats = useTierStats(search.rank, search.region, search.patch);
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
      {...scopeChoices(update)}
      sort={{ value: search.sort, onChange: (sort) => update({ sort }) }}
      toolbar={
        <>
          <SearchInput
            value={search.q ?? ""}
            onChange={(q) => update({ q: q || undefined })}
            placeholder="Search traits"
          />
          <ChoiceFilter
            options={STYLES.map((style) => ({
              value: style,
              label: STYLE_LABELS[style],
              className: TRAIT_TEXT[style],
            }))}
            value={search.style}
            onChange={(style) => update({ style })}
            label="Filter by breakpoint style"
            noneLabel="All styles"
          />
        </>
      }
      renderEntry={(key, line, sort) => {
        const found = traitBreakpoint(key, traitsByApi);
        if (!found) return null;
        const { trait, breakpoint } = found;
        return (
          <TierEntry
            icon={<TraitIcon trait={trait} style={traitStyle(breakpoint.style)} decorative className="size-12" />}
            label={`${breakpoint.minUnits} ${trait.name}`}
            line={line}
            sort={sort}
            play="of games"
            link={{ to: "/traits/$apiName", params: { apiName: trait.apiName } }}
            trend={<StatTrend trend={stats?.trend} kind="traits" entry={key} />}
            card={<TraitCard trait={trait} count={breakpoint.minUnits} />}
          />
        );
      }}
    />
  );
}

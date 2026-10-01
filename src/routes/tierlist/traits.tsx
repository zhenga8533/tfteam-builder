import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TraitCard } from "@/components/game/cards";
import { TraitIcon } from "@/components/game/icons";
import { TRAIT_TEXT } from "@/components/game/styles";
import { SearchInput } from "@/components/layout/search-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { StatTrend } from "@/features/stats/components/patch-trend";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";
import { type TraitStyle, traitStyle } from "@/lib/game/traits";
import { matches, stringParam } from "@/lib/search";
import { cn } from "@/lib/utils";

const STYLES = ["bronze", "silver", "gold", "prismatic", "unique"] as const satisfies TraitStyle[];
type BreakpointStyle = (typeof STYLES)[number];

interface TraitTierSearch {
  q?: string;
  style?: BreakpointStyle;
}

export const Route = createFileRoute("/tierlist/traits")({
  head: () => ({ meta: [{ title: "Trait Tier List · TFTeam Builder" }] }),
  validateSearch: (search: Record<string, unknown>): TraitTierSearch => ({
    q: stringParam(search.q),
    style: STYLES.includes(search.style as BreakpointStyle) ? (search.style as BreakpointStyle) : undefined,
  }),
  component: TraitTierListPage,
});

/** Trait entries are per breakpoint, keyed `apiName:minUnits` to match the content overrides. */
const traitKey = (apiName: string, minUnits: number) => `${apiName}:${minUnits}`;

function TraitTierListPage() {
  const { set } = useActiveSet();
  const { traitsByApi } = useGameData();
  const stats = useStats();
  const lines = (stats?.traits ?? [])
    .filter((line) => traitsByApi.has(line.trait))
    .map((line) => [traitKey(line.trait, line.minUnits), line] as [string, typeof line]);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const update = (patch: Partial<TraitTierSearch>) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true });
  const visible = (key: string) => {
    const [apiName = "", minUnits = ""] = key.split(":");
    const trait = traitsByApi.get(apiName);
    const breakpoint = trait?.breakpoints.find((entry) => entry.minUnits === Number(minUnits));
    return (
      !!trait &&
      !!breakpoint &&
      matches(trait.name, search.q) &&
      (!search.style || traitStyle(breakpoint.style) === search.style)
    );
  };

  return (
    <StatTierList
      title="Trait Tier List"
      description={`Set ${set} trait breakpoints ranked by average placement.`}
      lines={lines}
      overrides={tierListForSet(set)?.traits}
      visible={visible}
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
        const [apiName = "", minUnits = ""] = key.split(":");
        const trait = traitsByApi.get(apiName);
        const breakpoint = trait?.breakpoints.find((entry) => entry.minUnits === Number(minUnits));
        if (!trait || !breakpoint) return null;
        return (
          <TierEntry
            icon={<TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-12" />}
            label={`${breakpoint.minUnits} ${trait.name}`}
            line={line}
            link={{ to: "/traits/$apiName", params: { apiName: trait.apiName } }}
            trend={<StatTrend kind="traits" entry={key} />}
            card={<TraitCard trait={trait} count={breakpoint.minUnits} />}
          />
        );
      }}
    />
  );
}

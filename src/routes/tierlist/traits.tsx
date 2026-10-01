import { createFileRoute } from "@tanstack/react-router";
import { TraitCard } from "@/components/game/cards";
import { TraitIcon } from "@/components/game/icons";
import { tierListForSet } from "@/content";
import { StatTierList } from "@/features/stats/components/stat-tier-list";
import { TierEntry } from "@/features/stats/components/tier-entry";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";
import { traitStyle } from "@/lib/game/traits";

export const Route = createFileRoute("/tierlist/traits")({
  head: () => ({ meta: [{ title: "Trait Tier List · TFTeam Builder" }] }),
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

  return (
    <StatTierList
      title="Trait Tier List"
      description={`Set ${set} trait breakpoints ranked by average placement.`}
      lines={lines}
      overrides={tierListForSet(set)?.traits}
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
            card={<TraitCard trait={trait} count={breakpoint.minUnits} />}
          />
        );
      }}
    />
  );
}

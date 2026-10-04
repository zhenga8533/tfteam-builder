import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTable } from "@/features/stats/components/stat-table";
import { count, percent } from "@/features/stats/format";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { useGameData } from "@/lib/data/hooks";
import type { ExplorerFilter, ExplorerResult, ExplorerRow } from "@/lib/explorer/engine";
import { traitStyle } from "@/lib/game/traits";

const BASELINE = "the average of the boards matching your filters";

function AddButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 text-left"
      aria-label={label}
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
      {children}
    </button>
  );
}

interface ExplorerResultsProps {
  result: ExplorerResult;
  filters: ExplorerFilter[];
  onChange: (filters: ExplorerFilter[]) => void;
}

/** Summary of matching boards, plus what to add next: units, traits, and items on each filtered unit. */
export function ExplorerResults({ result, filters, onChange }: ExplorerResultsProps) {
  const { championsByApi, itemsByApi, traitsByApi } = useGameData();
  const { summary } = result;
  if (!summary)
    return <p className="py-16 text-center text-muted-foreground">No boards in the sample match these filters.</p>;

  const unitFilters = filters.flatMap((filter, index) => (filter.type === "unit" ? [{ filter, index }] : []));
  const add = (filter: ExplorerFilter) => onChange([...filters, filter]);

  const unitRows = result.units.flatMap((row: ExplorerRow) => {
    const champion = championsByApi.get(row.key);
    if (!champion) return [];
    return [
      {
        key: row.key,
        line: row.line,
        label: (
          <AddButton label={`Filter by ${champion.name}`} onClick={() => add({ type: "unit", unit: row.key })}>
            <ChampionIcon champion={champion} className="size-7" decorative />
            <span className="truncate">{champion.name}</span>
          </AddButton>
        ),
      },
    ];
  });
  const traitRows = result.traits.flatMap((row) => {
    const [apiName = "", minUnits = ""] = row.key.split(":");
    const trait = traitsByApi.get(apiName);
    const breakpoint = trait?.breakpoints.find((b) => b.minUnits === Number(minUnits));
    if (!trait || !breakpoint) return [];
    return [
      {
        key: row.key,
        line: row.line,
        label: (
          <AddButton
            label={`Filter by ${minUnits} ${trait.name}`}
            onClick={() => add({ type: "trait", trait: apiName, minUnits: Number(minUnits) })}
          >
            <TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-6" decorative />
            <span className="truncate">
              {minUnits} {trait.name}
            </span>
          </AddButton>
        ),
      },
    ];
  });

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-5">
        {[
          ["Boards", count(summary.games)],
          ["Avg placement", <AvgPlacement key="avg" line={summary} />],
          ["Top 4", percent(summary.top4)],
          ["Win rate", percent(summary.win)],
          ["Of sample", percent(summary.play)],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-display text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <Tabs defaultValue="units">
        <TabsList className="flex-wrap">
          <TabsTrigger value="units">Champions</TabsTrigger>
          <TabsTrigger value="traits">Traits</TabsTrigger>
          {unitFilters.map(({ filter, index }) => (
            <TabsTrigger key={index} value={`items-${index}`}>
              Items on {championsByApi.get(filter.unit)?.name ?? filter.unit}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="units" className="pt-3">
          <StatTable rows={unitRows} deltaBaseline={BASELINE} limit={20} />
        </TabsContent>
        <TabsContent value="traits" className="pt-3">
          <StatTable rows={traitRows} deltaBaseline={BASELINE} limit={20} />
        </TabsContent>
        {unitFilters.map(({ filter, index }) => (
          <TabsContent key={index} value={`items-${index}`} className="pt-3">
            <StatTable
              deltaBaseline={BASELINE}
              limit={20}
              rows={(result.items[filter.unit] ?? []).flatMap((row) => {
                const item = itemsByApi.get(row.key);
                if (!item || (filter.items?.length ?? 0) >= 3) return [];
                return [
                  {
                    key: row.key,
                    line: row.line,
                    label: (
                      <AddButton
                        label={`Require ${item.name}`}
                        onClick={() =>
                          onChange(
                            filters.map((current, i) =>
                              i === index && current.type === "unit"
                                ? { ...current, items: [...(current.items ?? []), row.key] }
                                : current,
                            ),
                          )
                        }
                      >
                        <ItemIcon item={item} className="size-7" decorative />
                        <span className="truncate">{item.name}</span>
                      </AddButton>
                    ),
                  },
                ];
              })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

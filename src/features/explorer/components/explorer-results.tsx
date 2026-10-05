import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { itemKindsIn, type ItemFilters, matchesItemFilters } from "@/components/game/filter-params";
import { ItemFilterBar } from "@/components/game/filters";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatTable } from "@/features/stats/components/stat-table";
import { count, percent, share } from "@/features/stats/format";
import { TrendBadge } from "@/features/stats/components/patch-trend";
import { AvgPlacement } from "@/features/stats/components/stat-summary";
import { useGameData } from "@/lib/data/hooks";
import type { PatchTrend } from "@/lib/data/schema";
import type { ExplorerFilter, ExplorerResult, ExplorerRow } from "@/lib/explorer/engine";
import { traitBreakpoint, traitStyle } from "@/lib/game/traits";

const BASELINE = "the average of the boards matching your filters";
const PLAY_BASELINE = "the boards matching your filters";
const LIMIT = 20;

function AddButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full min-w-0 items-center gap-2 text-left"
      aria-label={label}
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
      {children}
    </button>
  );
}

type UnitFilter = Extract<ExplorerFilter, { type: "unit" }>;

interface UnitItemsProps {
  /** The champion filters, each with its position in the full filter list. */
  units: { filter: UnitFilter; index: number }[];
  result: ExplorerResult;
  onRequire: (index: number, item: string) => void;
}

/**
 * Items held by one of the filtered champions, picked from their icons (the latest added by default). Picking an item
 * requires it; items already required aren't listed, since every matching board has them.
 */
function UnitItems({ units, result, onRequire }: UnitItemsProps) {
  const { championsByApi, itemsByApi } = useGameData();
  const [selected, setSelected] = useState<string>();
  const [filters, setFilters] = useState<ItemFilters>({});
  const active = units.find(({ filter }) => filter.unit === selected) ?? units.at(-1)!;
  const required = active.filter.items ?? [];
  const rows = required.length >= 3 ? [] : (result.items[active.filter.unit] ?? []);
  const held = rows.flatMap((row) => {
    const item = itemsByApi.get(row.key);
    return item && !required.includes(row.key) ? [{ row, item }] : [];
  });
  // Like the tables' own search: only offered when there are more rows than the table shows at first.
  const filterable = held.length > LIMIT;
  return (
    <div className="space-y-3">
      {units.length > 1 && (
        <ToggleGroup
          type="single"
          variant="outline"
          value={active.filter.unit}
          onValueChange={(unit) => unit && setSelected(unit)}
          className="flex-wrap"
          aria-label="Champion"
        >
          {units.map(({ filter, index }) => {
            const champion = championsByApi.get(filter.unit);
            return (
              <ToggleGroupItem key={index} value={filter.unit} className="gap-2 px-2" aria-label={champion?.name}>
                {champion && <ChampionIcon champion={champion} className="size-6" decorative />}
                <span className="max-sm:sr-only">{champion?.name ?? filter.unit}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      )}
      {filterable && (
        <ItemFilterBar value={filters} onChange={setFilters} kinds={itemKindsIn(held.map(({ item }) => item))} />
      )}
      <StatTable
        deltaBaseline={BASELINE}
        playBaseline={PLAY_BASELINE}
        limit={LIMIT}
        empty={
          required.length >= 3
            ? "This champion already holds three required items."
            : filterable
              ? "No items match these filters."
              : undefined
        }
        rows={held
          .filter(({ item }) => !filterable || matchesItemFilters([item], filters))
          .map(({ row, item }) => ({
            key: row.key,
            line: row.line,
            label: (
              <AddButton label={`Require ${item.name}`} onClick={() => onRequire(active.index, row.key)}>
                <ItemIcon item={item} className="size-7" decorative />
                <span className="truncate">{item.name}</span>
              </AddButton>
            ),
          }))}
      />
    </div>
  );
}

interface ExplorerResultsProps {
  result: ExplorerResult;
  filters: ExplorerFilter[];
  onChange: (filters: ExplorerFilter[]) => void;
  /** Changes since the previous patch at the shown rank floor, from the tier list stats. */
  trend?: PatchTrend;
}

/**
 * The tier list trends cover every board of an entry, so they only match results that do too: the summary for one
 * champion alone, and each row when nothing is filtered.
 */
function trendsFor(filters: ExplorerFilter[], trend: PatchTrend | undefined) {
  const only = filters.length === 1 ? filters[0] : undefined;
  const alone = only?.type === "unit" && !only.minStar && !only.items?.length ? only.unit : undefined;
  return {
    summary: alone ? trend?.units[alone] : undefined,
    unit: (key: string) => (filters.length === 0 ? trend?.units[key] : undefined),
    trait: (key: string) => (filters.length === 0 ? trend?.traits[key] : undefined),
  };
}

/** Summary of matching boards, plus what to add next: units, traits, and items on each filtered unit. */
export function ExplorerResults({ result, filters, onChange, trend }: ExplorerResultsProps) {
  const { championsByApi, traitsByApi } = useGameData();
  const [tab, setTab] = useState("units");
  const { summary } = result;
  if (!summary) return <p className="py-16 text-center text-muted-foreground">No boards match these filters.</p>;

  const unitFilters = filters.flatMap((filter, index) => (filter.type === "unit" ? [{ filter, index }] : []));
  // Removing the last champion filter removes the Items tab, so fall back to Champions.
  const shownTab = tab === "items" && unitFilters.length === 0 ? "units" : tab;
  const add = (filter: ExplorerFilter) => onChange([...filters, filter]);
  const trends = trendsFor(filters, trend);

  const unitRows = result.units.flatMap((row: ExplorerRow) => {
    const champion = championsByApi.get(row.key);
    if (!champion) return [];
    return [
      {
        key: row.key,
        name: champion.name,
        line: row.line,
        label: (
          <AddButton label={`Filter by ${champion.name}`} onClick={() => add({ type: "unit", unit: row.key })}>
            <ChampionIcon champion={champion} className="size-7" decorative />
            <span className="truncate">{champion.name}</span>
            <TrendBadge delta={trends.unit(row.key)} patch={trend?.patch} />
          </AddButton>
        ),
      },
    ];
  });
  const traitRows = result.traits.flatMap((row) => {
    const found = traitBreakpoint(row.key, traitsByApi);
    if (!found) return [];
    const { trait, breakpoint } = found;
    const { minUnits } = breakpoint;
    return [
      {
        key: row.key,
        name: trait.name,
        line: row.line,
        label: (
          <AddButton
            label={`Filter by ${minUnits} ${trait.name}`}
            onClick={() => add({ type: "trait", trait: trait.apiName, minUnits })}
          >
            <TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-6" decorative />
            <span className="truncate">
              {minUnits} {trait.name}
            </span>
            <TrendBadge delta={trends.trait(row.key)} patch={trend?.patch} />
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
          [
            "Avg placement",
            <span key="avg" className="inline-flex items-baseline gap-1.5">
              <AvgPlacement line={summary} />
              <TrendBadge delta={trends.summary} patch={trend?.patch} className="text-xs" />
            </span>,
          ],
          ["Top 4", percent(summary.top4)],
          ["Win rate", percent(summary.win)],
          ["Of boards", share(summary.play)],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-display text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <Tabs value={shownTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="units">Champions</TabsTrigger>
          <TabsTrigger value="traits">Traits</TabsTrigger>
          {unitFilters.length > 0 && <TabsTrigger value="items">Items</TabsTrigger>}
        </TabsList>
        <TabsContent value="units" className="pt-3">
          <StatTable
            rows={unitRows}
            deltaBaseline={BASELINE}
            playBaseline={PLAY_BASELINE}
            limit={LIMIT}
            search="Search champions"
          />
        </TabsContent>
        <TabsContent value="traits" className="pt-3">
          <StatTable
            rows={traitRows}
            deltaBaseline={BASELINE}
            playBaseline={PLAY_BASELINE}
            limit={LIMIT}
            search="Search traits"
          />
        </TabsContent>
        {unitFilters.length > 0 && (
          <TabsContent value="items" className="pt-3">
            <UnitItems
              units={unitFilters}
              result={result}
              onRequire={(index, item) =>
                onChange(
                  filters.map((current, i) =>
                    i === index && current.type === "unit"
                      ? { ...current, items: [...(current.items ?? []), item] }
                      : current,
                  ),
                )
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

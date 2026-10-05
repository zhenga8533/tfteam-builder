import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { EntityPicker, type EntityOption } from "@/components/game/entity-picker";
import { ChampionIcon, ItemIcon, TraitIcon } from "@/components/game/icons";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import { COST_TEXT, ITEM_KIND_LABELS } from "@/components/game/styles";
import { PageHeader } from "@/components/layout/page-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AutoCompCard } from "@/features/comps/components/comp-card";
import { NoStats } from "@/features/stats/components/no-stats";
import { StatTrend, TrendBadge } from "@/features/stats/components/patch-trend";
import { LOW_SAMPLE_HINT } from "@/features/stats/components/stat-summary";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { count, percent, share } from "@/features/stats/format";
import { parseRank } from "@/features/stats/scope";
import { useAutoComps, useCompTrendPatch, useGameData, useTierStats } from "@/lib/data/hooks";
import { isLowSample } from "@/lib/game/stat-line";
import { findComp } from "@/lib/game/comp-signature";
import type { RankFloor } from "@/lib/data/schema";
import { bestHolders } from "@/features/stats/builds";
import type { StatLine } from "@/lib/data/schema";
import { traitStyle } from "@/lib/game/traits";
import { stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";
import { cn } from "@/lib/utils";

const KINDS = ["champions", "items", "comps"] as const;
type Kind = (typeof KINDS)[number];

interface CompareSearch {
  kind?: Kind;
  rank?: RankFloor;
  a?: string;
  b?: string;
}

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): CompareSearch => ({
    kind: KINDS.includes(search.kind as Kind) ? (search.kind as Kind) : undefined,
    rank: parseRank(search.rank),
    a: stringParam(search.a),
    b: stringParam(search.b),
  }),
  component: ComparePage,
});

/** A side's champion or item: the icon above the name on phones, and long names wrap, so they fit the narrow columns. */
const HEADER_CLASS =
  "text-base font-semibold max-sm:flex-col max-sm:items-start max-sm:text-sm max-sm:[&>span]:whitespace-normal";

interface Side {
  key: string;
  header: ReactNode;
  line?: StatLine;
  /** Change since the previous patch, for the stats shown. */
  trend: ReactNode;
  /** Extra rows below the stats, e.g. cost and traits for a champion. */
  details: { label: string; value: ReactNode }[];
}

/**
 * Metric rows; `better` says which direction wins, so the stronger side is highlighted (play rate and games just
 * inform). A low-sample side never wins, and its average is marked as such.
 */
const METRICS: {
  label: string;
  value: (line: StatLine) => number;
  format: (value: number) => string;
  better?: "low" | "high";
  /** Muted, with a hint, for a low-sample side. */
  sampled?: boolean;
}[] = [
  { label: "Avg place", value: (line) => line.avg, format: (value) => value.toFixed(2), better: "low", sampled: true },
  { label: "Top 4", value: (line) => line.top4, format: percent, better: "high" },
  { label: "Win rate", value: (line) => line.win, format: percent, better: "high" },
  { label: "Play rate", value: (line) => line.play, format: share },
  { label: "Games", value: (line) => line.games, format: count },
];

function CompareTable({ sides }: { sides: [Side | undefined, Side | undefined] }) {
  const [a, b] = sides;
  const winner = (value: (line: StatLine) => number, better: "low" | "high"): 0 | 1 | null => {
    if (!a?.line || !b?.line || isLowSample(a.line) || isLowSample(b.line)) return null;
    const left = value(a.line);
    const right = value(b.line);
    if (left === right) return null;
    return (better === "low" ? left < right : left > right) ? 0 : 1;
  };
  const rows: { label: string; cells: [ReactNode, ReactNode]; best?: 0 | 1 | null }[] = [
    ...METRICS.map(({ label, value, format, better, sampled }) => ({
      label,
      cells: sides.map((side) => {
        if (!side?.line) return "–";
        const text = format(value(side.line));
        return sampled && isLowSample(side.line) ? (
          <span className="text-muted-foreground" title={LOW_SAMPLE_HINT}>
            {text} · low sample
          </span>
        ) : (
          text
        );
      }) as [ReactNode, ReactNode],
      best: better ? winner(value, better) : null,
    })),
    {
      label: "Since last patch",
      cells: sides.map((side) => side?.trend ?? null) as [ReactNode, ReactNode],
    },
    ...(a?.details ?? b?.details ?? []).map((detail, index) => ({
      label: detail.label,
      cells: sides.map((side) => side?.details[index]?.value ?? "–") as [ReactNode, ReactNode],
    })),
  ];

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b">
            <th className="w-24 sm:w-32" />
            {sides.map((side, index) => (
              <th key={index} className="p-2 text-left font-normal sm:p-3">
                {side?.header ?? <span className="text-muted-foreground">Pick one above</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t first:border-t-0">
              <th scope="row" className="p-2 text-left text-xs font-medium text-muted-foreground sm:p-3">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={cn("p-2 tabular-nums sm:p-3", row.best === index && "font-semibold text-cost-2")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionCompare({ a, b, rank }: { a?: string; b?: string; rank?: RankFloor }) {
  const { championsByApi, traitsByApi, itemsByApi } = useGameData();
  const stats = useTierStats(rank);
  const side = (apiName?: string): Side | undefined => {
    const champion = apiName ? championsByApi.get(apiName) : undefined;
    if (!champion) return undefined;
    const best = stats?.bestItems[champion.apiName] ?? [];
    return {
      key: champion.apiName,
      header: <ChampionLink champion={champion} iconClassName="size-10" className={HEADER_CLASS} />,
      line: stats?.units[champion.apiName],
      trend: <StatTrend trend={stats?.trend} kind="units" entry={champion.apiName} />,
      details: [
        { label: "Cost", value: <span className={COST_TEXT[champion.cost]}>{champion.cost}</span> },
        { label: "Role", value: champion.role ?? "–" },
        {
          label: "Traits",
          value: (
            <span className="flex flex-wrap gap-2">
              {champion.traits.flatMap((apiName) => {
                const trait = traitsByApi.get(apiName);
                return trait
                  ? [<TraitLink key={apiName} trait={trait} iconClassName="size-4" className="gap-1" />]
                  : [];
              })}
            </span>
          ),
        },
        {
          label: "Best items",
          value: best.length ? (
            <span className="flex flex-wrap gap-1">
              {best.slice(0, 3).flatMap((line) => {
                const item = itemsByApi.get(line.item);
                return item ? [<ItemLink key={line.item} item={item} label={null} iconClassName="size-7" />] : [];
              })}
            </span>
          ) : (
            "–"
          ),
        },
      ],
    };
  };
  return <CompareTable sides={[side(a), side(b)]} />;
}

function ItemCompare({ a, b, rank }: { a?: string; b?: string; rank?: RankFloor }) {
  const { itemsByApi, championsByApi } = useGameData();
  const stats = useTierStats(rank);
  const side = (apiName?: string): Side | undefined => {
    const item = apiName ? itemsByApi.get(apiName) : undefined;
    if (!item) return undefined;
    const holders = bestHolders(item.apiName, stats?.bestItems ?? {}, championsByApi, 4);
    return {
      key: item.apiName,
      header: <ItemLink item={item} iconClassName="size-10" className={HEADER_CLASS} />,
      line: stats?.items[item.apiName],
      trend: <StatTrend trend={stats?.trend} kind="items" entry={item.apiName} />,
      details: [
        { label: "Type", value: ITEM_KIND_LABELS[item.kind] },
        {
          label: "Best on",
          value: holders.length ? (
            <span className="flex flex-wrap gap-1">
              {holders.map(({ champion }) => (
                <ChampionLink key={champion.apiName} champion={champion} label={null} iconClassName="size-7" />
              ))}
            </span>
          ) : (
            "–"
          ),
        },
      ],
    };
  };
  return <CompareTable sides={[side(a), side(b)]} />;
}

function CompCompare({ a, b, rank }: { a?: string; b?: string; rank?: RankFloor }) {
  const comps = useAutoComps(rank) ?? [];
  const trendPatch = useCompTrendPatch(rank);
  const { traitsByApi } = useGameData();
  const side = (id?: string): Side | undefined => {
    const comp = id ? findComp(comps, id) : undefined;
    if (!comp) return undefined;
    return {
      key: comp.id,
      header: <span className="text-base font-semibold">{comp.name}</span>,
      line: comp,
      trend: <TrendBadge delta={comp.trend} patch={trendPatch} />,
      details: [
        { label: "Tier", value: comp.tier ?? "–" },
        { label: "Level", value: comp.level },
        {
          label: "Traits",
          value: (
            <span className="flex flex-wrap gap-2">
              {comp.traits
                .filter((entry) => traitsByApi.get(entry.trait)?.breakpoints.length !== 1)
                .slice(0, 4)
                .flatMap((entry) => {
                  const trait = traitsByApi.get(entry.trait);
                  const breakpoint = trait?.breakpoints.find((bp) => bp.minUnits === entry.minUnits);
                  return trait && breakpoint
                    ? [
                        <span key={entry.trait} className="inline-flex items-center gap-1">
                          <TraitIcon trait={trait} style={traitStyle(breakpoint.style)} className="size-4" />
                          {entry.minUnits}
                        </span>,
                      ]
                    : [];
                })}
            </span>
          ),
        },
      ],
    };
  };
  const chosen = [a, b].flatMap((id) => (id && findComp(comps, id)) || []);
  return (
    <div className="space-y-4">
      <CompareTable sides={[side(a), side(b)]} />
      {chosen.length > 0 && (
        <div className="grid gap-2 xl:grid-cols-2">
          {chosen.map((comp) => (
            <AutoCompCard key={comp.id} comp={comp} rank={rank} />
          ))}
        </div>
      )}
    </div>
  );
}

function usePickerOptions(kind: Kind, rank?: RankFloor): EntityOption[] {
  const { champions, items } = useGameData();
  const comps = useAutoComps(rank) ?? [];
  if (kind === "champions") {
    return champions.map((champion) => ({
      key: champion.apiName,
      label: champion.name,
      icon: <ChampionIcon champion={champion} />,
      hint: `${champion.cost}`,
    }));
  }
  if (kind === "items") {
    return items
      .filter((item) => item.kind !== "component")
      .map((item) => ({ key: item.apiName, label: item.name, icon: <ItemIcon item={item} /> }));
  }
  return comps.map((comp) => ({ key: comp.id, label: comp.name, icon: <span />, hint: comp.tier }));
}

const KIND_LABEL: Record<Kind, string> = { champions: "Champions", items: "Items", comps: "Comps" };

function ComparePage() {
  const search = Route.useSearch();
  const stats = useTierStats(search.rank);
  const update = useUpdateSearch<CompareSearch>();
  const kind = search.kind ?? "champions";
  const options = usePickerOptions(kind, search.rank);
  const singular = KIND_LABEL[kind].toLowerCase().replace(/s$/, "");

  return (
    <>
      <PageHeader title="Compare" description="Two champions, items or comps side by side, from ranked games." />
      {stats && <StatsMeta stats={stats} onRankChange={(rank) => update({ rank })} />}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(value) => value && update({ kind: value as Kind, a: undefined, b: undefined })}
          aria-label="What to compare"
        >
          {KINDS.map((option) => (
            <ToggleGroupItem key={option} value={option} className="px-3">
              {KIND_LABEL[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {(["a", "b"] as const).map((slot) => (
          <EntityPicker
            key={`${kind}-${slot}`}
            options={options.filter((option) => option.key !== search[slot === "a" ? "b" : "a"])}
            value={search[slot]}
            onChange={(value) => update({ [slot]: value })}
            placeholder={`Pick a ${singular}`}
            label={`${slot === "a" ? "First" : "Second"} ${singular}`}
            className="w-56"
          />
        ))}
      </div>
      {!stats ? (
        <NoStats />
      ) : kind === "champions" ? (
        <ChampionCompare a={search.a} b={search.b} rank={search.rank} />
      ) : kind === "items" ? (
        <ItemCompare a={search.a} b={search.b} rank={search.rank} />
      ) : (
        <CompCompare a={search.a} b={search.b} rank={search.rank} />
      )}
    </>
  );
}

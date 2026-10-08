import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ChampionFilterBar, ItemFilterBar } from "@/components/game/filters";
import {
  type ChampionFilters,
  type ItemFilters,
  itemKindsIn,
  matchesChampionFilters,
  matchesItemFilters,
  parseChampionFilters,
  parseItemFilters,
} from "@/components/game/filter-params";
import { ChampionLink, ItemLink, TraitLink } from "@/components/game/links";
import { ChampionIcon } from "@/components/game/icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompFilterBar } from "@/features/comps/components/comp-filter-bar";
import { type CompFilters, parseCompFilters, passesCompFilters } from "@/features/comps/filters";
import {
  arrivals,
  type ChangeEntry,
  changeEntries,
  placementMovers,
  playChange,
  playMovers,
} from "@/features/stats/changes";
import { NoStats } from "@/features/stats/components/no-stats";
import { PlayTrend, TrendBadge } from "@/features/stats/components/patch-trend";
import { StatsMeta } from "@/features/stats/components/stats-meta";
import { count, placement, share } from "@/features/stats/format";
import { parsePatch, parseRank } from "@/features/stats/scope";
import { useAutoCompsFile, useGameData, useStats, useTierStats } from "@/lib/data/hooks";
import type { AutoComps, RankFloor, SetStats } from "@/lib/data/schema";
import { traitBreakpoint, traitKey, traitStyle } from "@/lib/game/traits";
import { matches, oneOf } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";

const VIEWS = ["champions", "items", "traits", "comps"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABELS: Record<View, string> = { champions: "Champions", items: "Items", traits: "Traits", comps: "Comps" };

interface ChangesSearch extends ChampionFilters, ItemFilters, CompFilters {
  rank?: RankFloor;
  /** Another of the set's patches, whose changes since the patch before it are shown. */
  patch?: string;
  view?: View;
}

export const Route = createFileRoute("/tierlist/changes")({
  head: () => ({ meta: [{ title: "Patch Changes · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): ChangesSearch => ({
    ...parseChampionFilters(search),
    ...parseCompFilters(search),
    rank: parseRank(search.rank),
    patch: parsePatch(search.patch),
    view: oneOf(VIEWS, search.view),
    kind: parseItemFilters(search).kind,
  }),
  component: PatchChangesPage,
});

/** Entries listed per column until the list is expanded. */
const SHOWN = 8;

/** One row: the entry, its value on the earlier patch and now, and the change. */
interface Row {
  key: string;
  label: ReactNode;
  values?: ReactNode;
  change?: ReactNode;
  title?: string;
}

function RowList({ title, rows }: { title: string; rows: Row[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, SHOWN);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((row) => (
            <li key={row.key} className="flex items-center gap-2 text-sm" title={row.title}>
              <span className="min-w-0 flex-1">{row.label}</span>
              {row.values && <span className="text-xs text-muted-foreground tabular-nums">{row.values}</span>}
              {row.change && <span className="w-14 text-right">{row.change}</span>}
            </li>
          ))}
        </ul>
      )}
      {rows.length > SHOWN && (
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  );
}

function RowPair({
  title,
  description,
  left,
  right,
}: {
  title: string;
  description: string;
  left: { title: string; rows: Row[] };
  right: { title: string; rows: Row[] };
}) {
  return (
    <Section title={title}>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <RowList {...left} />
        <RowList {...right} />
      </div>
    </Section>
  );
}

/** Rows for each list, from `entries` and how to label one. */
function rowsFor(entries: ChangeEntry[], label: (key: string) => ReactNode, before: string, after: string) {
  const games = (entry: ChangeEntry) =>
    [
      entry.before && `${before}: ${placement(entry.before[0])} avg over ${count(entry.before[2])} games`,
      entry.now && `${after}: ${placement(entry.now.avg)} avg over ${count(entry.now.games)} games`,
    ]
      .filter(Boolean)
      .join(" · ");
  const placementRow = (entry: ChangeEntry): Row => ({
    key: entry.key,
    label: label(entry.key),
    values: entry.before && entry.now && `${placement(entry.before[0])} → ${placement(entry.now.avg)}`,
    change: <TrendBadge delta={entry.delta} patch={before} className="justify-end" />,
    title: games(entry),
  });
  const playRow = (entry: ChangeEntry): Row => ({
    key: entry.key,
    label: label(entry.key),
    values: `${share(entry.before![1])} → ${share(entry.now!.play)}`,
    change: <PlayTrend change={playChange(entry)!} />,
    title: games(entry),
  });
  const onlyRow = (entry: ChangeEntry): Row => ({
    key: entry.key,
    label: label(entry.key),
    values: `${share(entry.now?.play ?? entry.before![1])} of games`,
    title: games(entry),
  });
  const moved = placementMovers(entries);
  const play = playMovers(entries);
  const arrived = arrivals(entries);
  return {
    better: moved.better.map(placementRow),
    worse: moved.worse.map(placementRow),
    pickedUp: play.pickedUp.map(playRow),
    droppedOff: play.droppedOff.map(playRow),
    added: arrived.added.map(onlyRow),
    gone: arrived.gone.map(onlyRow),
  };
}

function EntryChanges({
  entries,
  label,
  before,
  after,
  noun,
  hasBefore,
}: {
  entries: ChangeEntry[];
  label: (key: string) => ReactNode;
  before: string;
  after: string;
  /** What the entries are, plural, e.g. "champions". */
  noun: string;
  /** Whether the earlier patch's lines are known, which play rates and new or gone entries need. */
  hasBefore: boolean;
}) {
  const rows = rowsFor(entries, label, before, after);
  return (
    <div className="space-y-6">
      <RowPair
        title="Average placement"
        description={`${noun} whose average placement moved most since patch ${before}, among those with enough games on both patches.`}
        left={{ title: "Better", rows: rows.better }}
        right={{ title: "Worse", rows: rows.worse }}
      />
      {hasBefore && (
        <RowPair
          title="Play rate"
          description={`${noun} played more and less often than on patch ${before}.`}
          left={{ title: "Picked up", rows: rows.pickedUp }}
          right={{ title: "Dropped off", rows: rows.droppedOff }}
        />
      )}
      {hasBefore && (rows.added.length > 0 || rows.gone.length > 0) && (
        <RowPair
          title="New and gone"
          description={`${noun} played on only one of the two patches.`}
          left={{ title: `New in ${after}`, rows: rows.added }}
          right={{ title: `Gone since ${before}`, rows: rows.gone }}
        />
      )}
    </div>
  );
}

function ChampionChanges({ stats, filters }: { stats: SetStats; filters: ChampionFilters }) {
  const { championsByApi } = useGameData();
  const trend = stats.trend!;
  const entries = changeEntries(stats.units, trend.units, trend.before?.units).filter((entry) => {
    const champion = championsByApi.get(entry.key);
    return champion && matchesChampionFilters(champion, filters);
  });
  return (
    <EntryChanges
      entries={entries}
      label={(key) => <ChampionLink champion={championsByApi.get(key)!} />}
      before={trend.patch}
      after={stats.patch}
      noun="Champions"
      hasBefore={!!trend.before}
    />
  );
}

function ItemChanges({ stats, filters }: { stats: SetStats; filters: ItemFilters }) {
  const { itemsByApi } = useGameData();
  const trend = stats.trend!;
  const entries = changeEntries(stats.items, trend.items, trend.before?.items).filter((entry) => {
    const item = itemsByApi.get(entry.key);
    return item && item.kind !== "component" && matchesItemFilters([item], filters);
  });
  return (
    <EntryChanges
      entries={entries}
      label={(key) => <ItemLink item={itemsByApi.get(key)!} />}
      before={trend.patch}
      after={stats.patch}
      noun="Items"
      hasBefore={!!trend.before && Object.keys(trend.before.items).length > 0}
    />
  );
}

function TraitChanges({ stats, q }: { stats: SetStats; q?: string }) {
  const { traitsByApi } = useGameData();
  const trend = stats.trend!;
  const lines = Object.fromEntries(stats.traits.map((line) => [traitKey(line.trait, line.minUnits), line]));
  const entries = changeEntries(lines, trend.traits, trend.before?.traits).filter((entry) => {
    const found = traitBreakpoint(entry.key, traitsByApi);
    return found && matches(found.trait.name, q);
  });
  const label = (key: string) => {
    const { trait, breakpoint } = traitBreakpoint(key, traitsByApi)!;
    return (
      <TraitLink
        trait={trait}
        style={traitStyle(breakpoint.style)}
        count={breakpoint.minUnits}
        label={`${breakpoint.minUnits} ${trait.name}`}
      />
    );
  };
  return (
    <EntryChanges
      entries={entries}
      label={label}
      before={trend.patch}
      after={stats.patch}
      noun="Trait breakpoints"
      hasBefore={!!trend.before}
    />
  );
}

function CompName({ name, carries, link }: { name: string; carries: string[]; link?: ReactNode }) {
  const { championsByApi } = useGameData();
  return (
    <span className="flex min-w-0 items-center gap-1">
      {carries.map((apiName) => {
        const champion = championsByApi.get(apiName);
        return champion ? <ChampionIcon key={apiName} champion={champion} className="size-6" decorative /> : null;
      })}
      <span className="ml-1 truncate">{link ?? name}</span>
    </span>
  );
}

function CompChanges({
  file,
  after,
  filters,
  rank,
  patch,
}: {
  file: AutoComps;
  /** The patch the comps are from. */
  after: string;
  filters: CompFilters;
  rank?: RankFloor;
  patch?: string;
}) {
  const { championsByApi } = useGameData();
  const base = useStats();
  const before = file.trendPatch!;
  const championName = (apiName: string) => championsByApi.get(apiName)?.name ?? "";
  const comps = file.comps.filter((comp) =>
    passesCompFilters(
      {
        name: comp.name,
        units: comp.units.map((unit) => unit.apiName),
        traits: comp.traits.map((entry) => entry.trait),
      },
      filters,
      championName,
    ),
  );
  const dropped = (file.dropped ?? []).filter((comp) =>
    passesCompFilters({ name: comp.name, units: comp.carries, traits: [] }, filters, championName),
  );
  const link = (id: string, name: string, onPatch?: string) => (
    <Link to="/comps/auto/$id" params={{ id }} search={{ rank, patch: onPatch }} className="hover:underline">
      {name}
    </Link>
  );
  // A dropped comp's page is on the earlier patch, which has its own comps only at the default floor.
  const droppedLink = !rank && base?.patches?.includes(before);
  const moved = comps.filter((comp) => comp.trend !== undefined);
  const row = (comp: (typeof comps)[number]): Row => ({
    key: comp.id,
    label: <CompName name={comp.name} carries={comp.carries} link={link(comp.id, comp.name, patch)} />,
    values: comp.trend !== undefined && `${placement(comp.avg - comp.trend)} → ${placement(comp.avg)}`,
    change: <TrendBadge delta={comp.trend} patch={before} className="justify-end" />,
  });
  const { better, worse } = placementMovers(moved.map((comp) => ({ key: comp.id, delta: comp.trend })));
  const byId = new Map(comps.map((comp) => [comp.id, comp]));
  return (
    <div className="space-y-6">
      <RowPair
        title="Average placement"
        description={`Comps whose average placement moved most since patch ${before}. Merged comps compare with every comp they now cover.`}
        left={{ title: "Better", rows: better.map((entry) => row(byId.get(entry.key)!)) }}
        right={{ title: "Worse", rows: worse.map((entry) => row(byId.get(entry.key)!)) }}
      />
      <RowPair
        title="New and gone"
        description="Comps with enough games on only one of the two patches."
        left={{
          title: `New in ${after}`,
          rows: comps
            .filter((comp) => comp.trend === undefined)
            .map((comp) => ({ ...row(comp), values: `${share(comp.play)} of games`, change: undefined })),
        }}
        right={{
          title: `Gone since ${before}`,
          rows: dropped.map((comp) => ({
            key: comp.id,
            label: (
              <CompName
                name={comp.name}
                carries={comp.carries}
                link={droppedLink ? link(comp.id, comp.name, before) : undefined}
              />
            ),
            values: `${share(comp.play)} of games`,
          })),
        }}
      />
    </div>
  );
}

function NoChanges({ stats }: { stats: SetStats }) {
  return (
    <EmptyState>
      No earlier patch of Set {stats.set} has stats to compare patch {stats.patch} with yet.
    </EmptyState>
  );
}

function PatchChangesPage() {
  const search = Route.useSearch();
  const { rank, patch } = search;
  const view = search.view ?? "champions";
  const stats = useTierStats(rank, undefined, patch);
  const comps = useAutoCompsFile(rank, patch);
  const { items } = useGameData();
  const update = useUpdateSearch<ChangesSearch>();
  const trend = stats?.trend;
  const clearFilters = {
    q: undefined,
    cost: undefined,
    trait: undefined,
    kind: undefined,
    champions: undefined,
    traits: undefined,
  };

  return (
    <>
      <PageHeader
        title="Patch Changes"
        description={
          trend
            ? `What changed between patch ${trend.patch} and ${stats.patch}: average placement, play rate, and what's new or gone.`
            : "What changed since the previous patch: average placement, play rate, and what's new or gone."
        }
      />
      {stats && (
        <StatsMeta
          stats={stats}
          onRankChange={(rank) => update({ rank, patch: undefined })}
          patch={{ onChange: (patch) => update({ patch, rank: undefined }) }}
        />
      )}
      {stats?.notes && (
        <a
          href={stats.notes}
          target="_blank"
          rel="noreferrer"
          className="-mt-3 mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Read the patch {stats.patch} notes <ExternalLink className="size-3.5" />
        </a>
      )}
      {!stats ? (
        <NoStats />
      ) : !trend ? (
        <NoChanges stats={stats} />
      ) : (
        <Tabs value={view} onValueChange={(next) => update({ view: next as View, ...clearFilters })}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <TabsList>
              {VIEWS.map((option) => (
                <TabsTrigger key={option} value={option}>
                  {VIEW_LABELS[option]}
                </TabsTrigger>
              ))}
            </TabsList>
            {view === "champions" && <ChampionFilterBar value={search} onChange={update} />}
            {view === "items" && (
              <ItemFilterBar
                value={search}
                onChange={({ q, kind }) => update({ q, kind })}
                kinds={itemKindsIn(items.filter((item) => item.kind !== "component"))}
              />
            )}
            {view === "traits" && (
              <SearchInput
                value={search.q ?? ""}
                onChange={(q) => update({ q: q || undefined })}
                placeholder="Search traits"
                className="max-w-xs"
              />
            )}
            {view === "comps" && <CompFilterBar value={search} onChange={update} />}
          </div>
          {view === "champions" && <ChampionChanges stats={stats} filters={search} />}
          {view === "items" && <ItemChanges stats={stats} filters={search} />}
          {view === "traits" && <TraitChanges stats={stats} q={search.q} />}
          {view === "comps" &&
            (comps?.trendPatch ? (
              <CompChanges file={comps} after={stats.patch} filters={search} rank={rank} patch={patch} />
            ) : (
              <NoChanges stats={stats} />
            ))}
        </Tabs>
      )}
    </>
  );
}

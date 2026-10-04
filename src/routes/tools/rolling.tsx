import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
import { ChampionFilter } from "@/components/game/filters";
import { ChampionIcon } from "@/components/game/icons";
import { COST_TEXT, COSTS } from "@/components/game/styles";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { percent } from "@/features/stats/format";
import { useGameData } from "@/lib/data/hooks";
import { COPIES_FOR_STAR, REROLL_COST, rollOdds, SHOP_SLOTS } from "@/lib/game/roll-odds";
import { numberParam, stringParam } from "@/lib/search";
import { useUpdateSearch } from "@/lib/use-update-search";
import { cn } from "@/lib/utils";

interface RollingSearch {
  champion?: string;
  level?: number;
  gold?: number;
  /** Copies the player already has. */
  owned?: number;
  /** Copies other players hold. */
  contested?: number;
  /** Other champions of the same cost out of the pool. */
  others?: number;
  star?: 2 | 3;
}

const DEFAULTS: Required<Omit<RollingSearch, "champion">> = {
  level: 8,
  gold: 50,
  owned: 0,
  contested: 0,
  others: 0,
  star: 2,
};
const LEVELS = [3, 4, 5, 6, 7, 8, 9, 10];
/** Rounding would show a small but real chance as 0% (or a near-certain one as 100%). */
const formatChance = (chance: number) =>
  chance > 0 && chance < 0.005 ? "<1%" : chance < 1 && chance > 0.995 ? ">99%" : percent(chance);

/** Gold steps on the chart. */
const CHART_GOLD = 100;

export const Route = createFileRoute("/tools/rolling")({
  head: () => ({ meta: [{ title: "Roll Odds · TFTeam" }] }),
  validateSearch: (search: Record<string, unknown>): RollingSearch => {
    const star = numberParam(search.star);
    return {
      champion: stringParam(search.champion),
      level: numberParam(search.level),
      gold: numberParam(search.gold),
      owned: numberParam(search.owned),
      contested: numberParam(search.contested),
      others: numberParam(search.others),
      star: star === 2 || star === 3 ? star : undefined,
    };
  },
  component: RollingPage,
});

/**
 * A labelled control. Button groups get a named group rather than a <label>: a label passes its hover
 * and clicks to its first control, which would light up the first button whenever any was hovered.
 */
function Field({
  label,
  hint,
  input = false,
  children,
}: {
  label: string;
  hint?: string;
  /** The child is a single form input, so a real <label> fits. */
  input?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const caption = (
    <span id={id} className="block text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
  const note = hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>;
  return input ? (
    <label className="block space-y-1">
      {caption}
      {children}
      {note}
    </label>
  ) : (
    <div role="group" aria-labelledby={id} className="space-y-1">
      {caption}
      {children}
      {note}
    </div>
  );
}

function NumberField({ value, onChange, max }: { value: number; onChange: (value: number) => void; max: number }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={value}
      onChange={(event) => onChange(Math.min(max, Math.max(0, Math.floor(Number(event.target.value) || 0))))}
      className="w-28 tabular-nums"
    />
  );
}

/** Chance of hitting by gold spent, as a line from 0 to `CHART_GOLD` gold. */
function OddsChart({ byShop, gold }: { byShop: number[]; gold: number }) {
  const width = 480;
  const height = 120;
  const pad = 8;
  const x = (spent: number) => pad + (spent / CHART_GOLD) * (width - pad * 2);
  const y = (chance: number) => height - pad - chance * (height - pad * 2);
  const points = byShop.map((chance, shop) => `${shop ? "L" : "M"}${x(shop * REROLL_COST)},${y(chance)}`).join(" ");
  const marker = Math.min(gold, CHART_GOLD);
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Chance to hit by gold spent">
        {[0.25, 0.5, 0.75].map((level) => (
          <line
            key={level}
            x1={pad}
            x2={width - pad}
            y1={y(level)}
            y2={y(level)}
            className="stroke-border"
            strokeDasharray="3 3"
          />
        ))}
        <line x1={x(marker)} x2={x(marker)} y1={pad} y2={height - pad} className="stroke-primary/50" />
        <path d={points} fill="none" className="stroke-primary" strokeWidth={2} />
      </svg>
      <figcaption className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>0 gold</span>
        <span>{CHART_GOLD / 2} gold</span>
        <span>{CHART_GOLD} gold</span>
      </figcaption>
    </figure>
  );
}

function RollingPage() {
  const { champions, championsByApi, shop } = useGameData();
  const search = Route.useSearch();
  const update = useUpdateSearch<RollingSearch>();
  const level = search.level ?? DEFAULTS.level;
  const gold = search.gold ?? DEFAULTS.gold;
  const owned = search.owned ?? DEFAULTS.owned;
  const contested = search.contested ?? DEFAULTS.contested;
  const others = search.others ?? DEFAULTS.others;
  const star = search.star ?? DEFAULTS.star;

  if (!shop) {
    return (
      <>
        <PageHeader title="Roll Odds" description="Your chance of finding the copies you need while rolling." />
        <EmptyState>Riot's game data for this set doesn't include shop odds.</EmptyState>
      </>
    );
  }

  const inPool = new Set(shop.pool.flatMap((tier) => tier.champions));
  const shopChampions = champions.filter((champion) => inPool.has(champion.apiName));
  const champion = search.champion ? championsByApi.get(search.champion) : undefined;
  const tier = champion ? shop.pool.find((entry) => entry.cost === champion.cost) : undefined;
  const odds = shop.odds[level - 1] ?? [];
  const copies = tier?.copies ?? 0;
  const needed = COPIES_FOR_STAR[star];
  const wanted = Math.max(0, needed - owned);
  const shops = Math.floor(gold / REROLL_COST);
  const chartShops = CHART_GOLD / REROLL_COST;
  const input =
    champion && tier
      ? {
          costOdds: odds[champion.cost - 1] ?? 0,
          copiesPerChampion: copies,
          championsOfCost: tier.champions.length,
          taken: owned + contested,
          othersTaken: others,
        }
      : null;
  const result = input ? rollOdds({ ...input, wanted }, Math.max(shops, chartShops)) : null;
  const chance = result?.byShop[shops] ?? 0;
  const perShop = input ? rollOdds({ ...input, wanted: 1 }, 1).byShop[1] : undefined;

  return (
    <>
      <PageHeader
        title="Roll Odds"
        description="Your chance of finding the copies you need while rolling, from this set's shop odds and pool."
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Section title="Your shop">
          <div className="space-y-4">
            <Field label="Champion">
              <ChampionFilter
                value={search.champion}
                onChange={(value) => update({ champion: value })}
                only={shopChampions.map((entry) => entry.apiName)}
                placeholder="Pick a champion"
                className="w-full"
              />
            </Field>
            <Field label="Goal">
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(star)}
                onValueChange={(value) => value && update({ star: Number(value) as 2 | 3 })}
                className="w-full"
              >
                <ToggleGroupItem value="2" className="flex-1">
                  2★ ({COPIES_FOR_STAR[2]} copies)
                </ToggleGroupItem>
                <ToggleGroupItem value="3" className="flex-1">
                  3★ ({COPIES_FOR_STAR[3]} copies)
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field label="Level">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={String(level)}
                onValueChange={(value) => value && update({ level: Number(value) })}
                className="w-full flex-wrap"
              >
                {LEVELS.map((value) => (
                  <ToggleGroupItem key={value} value={String(value)} className="flex-1 tabular-nums">
                    {value}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field input label="Gold to roll" hint={`${shops} rerolls`}>
                <NumberField value={gold} onChange={(value) => update({ gold: value })} max={500} />
              </Field>
              <Field input label="Copies you have">
                <NumberField value={owned} onChange={(value) => update({ owned: value })} max={needed} />
              </Field>
              <Field input label="Held by others" hint="Copies on other boards and benches">
                <NumberField value={contested} onChange={(value) => update({ contested: value })} max={copies || 30} />
              </Field>
              <Field
                input
                label={`Other ${champion ? `${champion.cost}-costs` : "same-cost units"} out`}
                hint="Raises your odds"
              >
                <NumberField value={others} onChange={(value) => update({ others: value })} max={200} />
              </Field>
            </div>
          </div>
        </Section>

        <div className="space-y-6">
          {!champion || !tier || !result ? (
            <EmptyState>Pick a champion to see your odds.</EmptyState>
          ) : (
            <Section title={`Hitting ${star}★ ${champion.name}`}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <ChampionIcon champion={champion} className="size-14" />
                  <div>
                    <p className="font-display text-4xl font-bold tabular-nums">
                      {wanted === 0 ? "Done" : formatChance(chance)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {wanted === 0
                        ? `You already have ${needed} copies.`
                        : `to find ${wanted} more ${wanted === 1 ? "copy" : "copies"} with ${gold} gold (${shops} rerolls)`}
                    </p>
                  </div>
                  <dl className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Expected gold</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {result.expectedShops === null
                        ? "Not possible"
                        : `~${Math.ceil(result.expectedShops) * REROLL_COST}`}
                    </dd>
                    <dt className="text-muted-foreground">Copy per shop</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {perShop === undefined ? "–" : formatChance(perShop)}
                    </dd>
                    <dt className="text-muted-foreground">Copies left</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {Math.max(0, copies - owned - contested)} of {copies}
                    </dd>
                  </dl>
                </div>
                {result.expectedShops === null && wanted > 0 && (
                  <p className="text-sm text-destructive">
                    {copies - owned - contested < wanted
                      ? "Not enough copies are left in the pool."
                      : `${champion.cost}-costs don't appear in level ${level} shops.`}
                  </p>
                )}
                <OddsChart byShop={result.byShop.slice(0, chartShops + 1)} gold={gold} />
              </div>
            </Section>
          )}

          <Section title={`Level ${level} shop odds`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-1 text-left font-medium">Cost</th>
                  <th className="py-1 text-right font-medium">Per slot</th>
                  <th className="py-1 text-right font-medium">Champions</th>
                  <th className="py-1 text-right font-medium">Copies each</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((cost) => {
                  const entry = shop.pool.find((poolTier) => poolTier.cost === cost);
                  return (
                    <tr key={cost} className={cn("border-t", champion?.cost === cost && "bg-primary/10")}>
                      <td className={cn("py-1.5 font-semibold", COST_TEXT[cost])}>{cost}</td>
                      <td className="py-1.5 text-right tabular-nums">{percent(odds[cost - 1] ?? 0)}</td>
                      <td className="py-1.5 text-right tabular-nums">{entry?.champions.length ?? "–"}</td>
                      <td className="py-1.5 text-right tabular-nums">{entry?.copies ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Each shop shows {SHOP_SLOTS} champions; a reroll costs {REROLL_COST} gold. Odds come from Riot's game data
              for this set.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}

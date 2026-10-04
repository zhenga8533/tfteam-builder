import { tierListForSet } from "@/content";
import type { Tier, TierRows } from "@/content/types";
import { tierListRows } from "@/features/stats/tiers";
import { useActiveSet, useGameData, useStats } from "@/lib/data/hooks";
import type { Augment, Champion, Item, Trait } from "@/lib/data/schema";
import { type TraitStyle, traitStyle } from "@/lib/game/traits";
import type { MakerKind } from "./model";

/** One thing that can be placed in a tier, with what's needed to draw it on the page and in an image. */
export type MakerEntry = { key: string; label: string; image: string } & (
  | { kind: "champions"; champion: Champion }
  | { kind: "items"; item: Item }
  | { kind: "traits"; trait: Trait; minUnits: number; style: TraitStyle }
  | { kind: "augments"; augment: Augment }
);

export interface MakerSource {
  entries: MakerEntry[];
  byKey: Map<string, MakerEntry>;
  /** The tier list as the site shows it now: stats with overrides, the fallback, or the hand-written augments. */
  siteRows: TierRows;
  /** Each entry's tier from the stats (undefined: too few games); null when the list isn't stats-based. */
  statTiers: Map<string, Tier | undefined> | null;
}

/** Trait entries are per breakpoint, keyed `apiName:minUnits` like the tier list overrides. */
const traitKey = (apiName: string, minUnits: number) => `${apiName}:${minUnits}`;

/** Everything the Tier List Maker can rank for `kind`, and where the site currently ranks it. */
export function useMakerSource(kind: MakerKind): MakerSource {
  const { set } = useActiveSet();
  const { champions, items, traits, augments } = useGameData();
  const stats = useStats();
  const tierList = tierListForSet(set);

  const entries: MakerEntry[] =
    kind === "champions"
      ? champions.map((champion) => ({
          kind,
          key: champion.apiName,
          label: champion.name,
          image: champion.icon,
          champion,
        }))
      : kind === "items"
        ? // Components are carried around mid-game rather than built, so they aren't ranked.
          items
            .filter((item) => item.kind !== "component")
            .map((item) => ({ kind, key: item.apiName, label: item.name, image: item.icon, item }))
        : kind === "traits"
          ? traits.flatMap((trait) =>
              trait.breakpoints.map(({ minUnits, style }) => ({
                kind,
                key: traitKey(trait.apiName, minUnits),
                label: `${minUnits} ${trait.name}`,
                image: trait.icon,
                trait,
                minUnits,
                style: traitStyle(style),
              })),
            )
          : augments.map((augment) => ({
              kind,
              key: augment.apiName,
              label: augment.name,
              image: augment.icon,
              augment,
            }));
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));

  if (kind === "augments") return { entries, byKey, siteRows: tierList?.augments ?? {}, statTiers: null };

  const lines =
    kind === "champions"
      ? Object.entries(stats?.units ?? {})
      : kind === "items"
        ? Object.entries(stats?.items ?? {})
        : (stats?.traits ?? []).map((line) => [traitKey(line.trait, line.minUnits), line] as const);
  const ranked = lines.filter(([key]) => byKey.has(key)).sort(([, a], [, b]) => a.score - b.score);
  const statTiers = ranked.length ? new Map(ranked.map(([key, line]) => [key, line.tier])) : null;
  const { rows } = tierListRows({
    generated: ranked.map(([key, line]) => ({ key, tier: line.tier })),
    hasStats: ranked.length > 0,
    overrides: tierList?.[kind],
    fallback: tierList?.fallback?.[kind],
  });
  return { entries, byKey, siteRows: rows, statTiers };
}

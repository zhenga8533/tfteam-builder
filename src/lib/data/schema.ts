import { z } from "zod";
import { ITEM_KINDS, PATCHES, RANK_OPTIONS, REGIONS, STAT_TIERS } from "./constants";

export const patchSchema = z.enum(PATCHES);
export type Patch = z.infer<typeof patchSchema>;

const numberRecord = z.record(z.string(), z.number());

export const championSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  cost: z.number().int().min(1).max(5),
  traits: z.array(z.string()),
  icon: z.string(),
  /** Wide splash art; empty when the set has none. */
  splash: z.string(),
  /** In-game combat role, e.g. "Magic Caster"; absent for sets whose data doesn't include roles. */
  role: z.string().optional(),
  plannerCode: z.number().int().optional(),
  /** For an alternate form such as "Lux (Coven)": the apiName of the shop champion it's a form of. */
  formOf: z.string().optional(),
  /** Traits this champion counts as more than one unit for (e.g. an Avatar's chosen trait counts twice). */
  traitCounts: z.record(z.string(), z.number().int()).optional(),
  ability: z.object({
    name: z.string(),
    desc: z.string(),
    icon: z.string(),
    variables: z.record(z.string(), z.array(z.number())),
  }),
  stats: z.object({
    hp: z.number(),
    mana: z.number(),
    initialMana: z.number(),
    damage: z.number(),
    attackSpeed: z.number(),
    armor: z.number(),
    magicResist: z.number(),
    critChance: z.number(),
    critMultiplier: z.number(),
    range: z.number(),
  }),
});
export type Champion = z.infer<typeof championSchema>;

const traitBreakpointSchema = z.object({
  minUnits: z.number().int(),
  maxUnits: z.number().int(),
  style: z.number().int(),
  variables: numberRecord,
});
export type TraitBreakpoint = z.infer<typeof traitBreakpointSchema>;

export const traitSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  breakpoints: z.array(traitBreakpointSchema),
  /** "champion" traits come from shop champions (or their forms); "other" ones from augments or set mechanics. */
  source: z.enum(["champion", "other"]),
});
export type Trait = z.infer<typeof traitSchema>;

export const itemKindSchema = z.enum(ITEM_KINDS);
export type ItemKind = z.infer<typeof itemKindSchema>;

export const itemSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  kind: itemKindSchema,
  composition: z.array(z.string()),
  effects: numberRecord,
  unique: z.boolean(),
  /** Trait apiName granted by an emblem. */
  trait: z.string().optional(),
});
export type Item = z.infer<typeof itemSchema>;

export const augmentTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type AugmentTier = z.infer<typeof augmentTierSchema>;

export const augmentSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  tier: augmentTierSchema,
  effects: numberRecord,
  associatedTraits: z.array(z.string()),
});
export type Augment = z.infer<typeof augmentSchema>;

export const setDataSchema = z.object({
  number: z.number().int(),
  name: z.string(),
  champions: z.array(championSchema),
  traits: z.array(traitSchema),
  items: z.array(itemSchema),
  /** Duplicate item apiNames (as they may appear in match data) → the apiName kept in `items`. */
  itemAliases: z.record(z.string(), z.string()),
  /** Same-name clones of a champion (as they appear in match data) → the champion's apiName. */
  championAliases: z.record(z.string(), z.string()),
  augments: z.array(augmentSchema),
  /** Shop odds and champion pool, from Riot's map data; absent for sets without it. */
  shop: z
    .object({
      /** Per player level (index 0 is level 1): the chance of each cost (1–5) in a shop slot. */
      odds: z.array(z.array(z.number())),
      /** Per cost: the champions in the pool and the copies of each. */
      pool: z.array(z.object({ cost: z.number().int(), champions: z.array(z.string()), copies: z.number().int() })),
    })
    .optional(),
});
export type SetData = z.infer<typeof setDataSchema>;

export const manifestSchema = z.object({
  generatedAt: z.string(),
  patches: z.record(
    patchSchema,
    z.object({
      /** Game client version from CommunityDragon, e.g. "16.19". */
      version: z.string(),
      /** TFT's own patch name, e.g. "18.3b"; falls back to `version` when Riot's patch notes can't be read. */
      label: z.string(),
      sets: z.array(z.number().int()),
    }),
  ),
});
export type Manifest = z.infer<typeof manifestSchema>;

export const statLineSchema = z.object({
  games: z.number().int(),
  /** Average placement, as played. */
  avg: z.number(),
  /** Average placement pulled toward 4.5 for small samples; what tiers and "best" orderings rank by. */
  score: z.number(),
  top4: z.number(),
  win: z.number(),
  /** Share of the games the entry is counted against: all games (one per player per match) for units, items and traits. */
  play: z.number(),
  tier: z.enum(STAT_TIERS).optional(),
  /** Games ending 1st to 8th; only on lines shown with a placement distribution. */
  places: z.array(z.number().int()).length(8).optional(),
});
export type StatLine = z.infer<typeof statLineSchema>;

export const traitStatSchema = statLineSchema.extend({ trait: z.string(), minUnits: z.number().int() });
export type TraitStat = z.infer<typeof traitStatSchema>;

/** Change in average placement since `patch` (negative = placing better), keyed like the stats. */
export const patchTrendSchema = z.object({
  patch: z.string(),
  units: numberRecord,
  items: numberRecord,
  /** Keyed `apiName:minUnits`. */
  traits: numberRecord,
});
export type PatchTrend = z.infer<typeof patchTrendSchema>;

/** Average placement per patch, oldest first; null where a patch had too few games. */
export const patchHistorySchema = z.object({
  patches: z.array(z.string()),
  units: z.record(z.string(), z.array(z.number().nullable())),
  items: z.record(z.string(), z.array(z.number().nullable())),
  /** Keyed `apiName:minUnits`. */
  traits: z.record(z.string(), z.array(z.number().nullable())),
});
export type PatchHistory = z.infer<typeof patchHistorySchema>;

export const setStatsSchema = z.object({
  set: z.number().int(),
  patch: z.string(),
  updatedAt: z.string(),
  /** "collecting" until there are enough games at the lowest rank floor. */
  status: z.enum(["ready", "collecting"]),
  rankFloor: z.enum(RANK_OPTIONS),
  /** Set on regional stats: the region they cover. */
  region: z.enum(REGIONS).optional(),
  /** Regions with their own tier list stats (`set{N}/regions/{region}.json`), at this file's floor. */
  regions: z.array(z.enum(REGIONS)).optional(),
  /** Other rank floors with their own tier list stats (`set{N}/ranks/{floor}.json`). */
  ranks: z.array(z.enum(RANK_OPTIONS)).optional(),
  matches: z.number().int(),
  /** True when the current patch is too new and the previous patch's stats are shown instead. */
  previousPatch: z.boolean(),
  /**
   * Set alongside `previousPatch`: the newest patch and its matches so far at this floor. Its early tier list stats
   * are in `set{N}/newest-patch.json`.
   */
  newestPatch: z.object({ patch: z.string(), matches: z.number().int() }).optional(),
  units: z.record(z.string(), statLineSchema),
  items: z.record(z.string(), statLineSchema),
  /** Items are counted once per board. Older stats counted every copy, so item trends don't compare against them. */
  itemsPerBoard: z.boolean().optional(),
  traits: z.array(traitStatSchema),
  bestItems: z.record(z.string(), z.array(statLineSchema.extend({ item: z.string() }))),
  /** Movement since the previous patch with saved stats; absent until there is one. */
  trend: patchTrendSchema.optional(),
  /** Final stats of a finished set, published from its archive rather than rebuilt. */
  frozen: z.boolean().optional(),
});
export type SetStats = z.infer<typeof setStatsSchema>;
export type RankFloor = SetStats["rankFloor"];

/** A stat line plus its difference from the champion's own average placement (negative is better). */
export const deltaStatSchema = statLineSchema.extend({ delta: z.number() });
export type DeltaStat = z.infer<typeof deltaStatSchema>;

export const championStatsSchema = z.object({
  apiName: z.string(),
  overall: statLineSchema,
  /** Keyed by star level. */
  stars: z.record(z.string(), statLineSchema),
  /**
   * Item subsets (1–3 items, sorted, duplicates allowed) the champion held, counted per unit instance.
   * A held set counts toward each of its subsets, so `[A, B]` covers boards with A, B and any third item.
   */
  builds: z.array(deltaStatSchema.extend({ items: z.array(z.string()) })),
  /** Other units on the same board. */
  partners: z.array(deltaStatSchema.extend({ unit: z.string() })),
  /** Active trait breakpoints on the same board. */
  traits: z.array(deltaStatSchema.extend({ trait: z.string(), minUnits: z.number().int() })),
  /** IDs of detected comps whose core board includes this champion. */
  comps: z.array(z.string()),
});
export type ChampionStats = z.infer<typeof championStatsSchema>;

export const itemStatsSchema = z.object({
  apiName: z.string(),
  /** Champions holding the item; delta is against each champion's own average placement. */
  holders: z.array(deltaStatSchema.extend({ unit: z.string() })),
  /** Items built on the same unit; delta is against this item's average placement. */
  pairs: z.array(deltaStatSchema.extend({ item: z.string() })),
  /** IDs of detected comps whose core board builds this item. */
  comps: z.array(z.string()),
});
export type ItemStats = z.infer<typeof itemStatsSchema>;

export const traitStatsSchema = z.object({
  apiName: z.string(),
  /** Units on boards with the trait active; delta is against those boards' average placement. */
  units: z.array(deltaStatSchema.extend({ unit: z.string() })),
  /** IDs of detected comps that run the trait. */
  comps: z.array(z.string()),
});
export type TraitStats = z.infer<typeof traitStatsSchema>;

/** A comp detected from match data: boards sharing the same carries and core traits. */
export const autoCompSchema = statLineSchema.extend({
  id: z.string(),
  /** `carries|coreTraits`, as produced by `compSignature`; used to match hand-written guides. */
  signature: z.string(),
  /**
   * Signatures of variants merged into this comp: the same carries and main trait with a different second trait,
   * or the same board with its items on other carries (see `progression`).
   */
  variants: z.array(z.string()),
  name: z.string(),
  carries: z.array(z.string()),
  /** Traits active on most of the comp's boards, at their most common breakpoint. */
  traits: z.array(z.object({ trait: z.string(), minUnits: z.number().int(), frequency: z.number() })),
  /** The core board: units on at least half of the comp's boards, with their usual star level and items. */
  units: z.array(
    z.object({ apiName: z.string(), star: z.number().int(), items: z.array(z.string()), frequency: z.number() }),
  ),
  /** Units often added on top of the core board. */
  flex: z.array(z.object({ apiName: z.string(), frequency: z.number() })),
  /** Median player level. */
  level: z.number().int(),
  /** Change in average placement since `trendPatch` (negative = placing better); absent for new comps. */
  trend: z.number().optional(),
  /** Median round the comp is knocked out on when it doesn't win (absent until enough boards record it). */
  knockoutRound: z.number().int().optional(),
  /** Placement by the player's final level, for levels with enough games; `play` is the share of the comp's games. */
  byLevel: z.array(statLineSchema.extend({ level: z.number().int() })),
  /**
   * Placement by who held the items at the end, when that varies: boards that go out early still have them on
   * earlier carries. Worst average first; `play` is the share of the comp's games. Empty when the carries don't vary.
   */
  progression: z.array(statLineSchema.extend({ carries: z.array(z.string()) })),
});
export type AutoComp = z.infer<typeof autoCompSchema>;

export const autoCompsSchema = z.object({
  comps: z.array(autoCompSchema),
  /** The previous patch `trend` compares with, when there is one. */
  trendPatch: z.string().optional(),
});
export type AutoComps = z.infer<typeof autoCompsSchema>;

export const littleLegendSchema = statLineSchema.extend({
  name: z.string(),
  species: z.string(),
  icon: z.string(),
  kind: z.enum(["legend", "chibi"]),
});
export type LittleLegend = z.infer<typeof littleLegendSchema>;

/** Little Legends on the published stats' boards, most played first; `play` is the share of players. */
export const littleLegendsSchema = z.object({ legends: z.array(littleLegendSchema) });
export type LittleLegends = z.infer<typeof littleLegendsSchema>;

import { z } from "zod";
import { ITEM_KINDS, PATCHES } from "./constants";

export const patchSchema = z.enum(PATCHES);
export type Patch = z.infer<typeof patchSchema>;

const numberRecord = z.record(z.string(), z.number());

export const championSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  cost: z.number().int().min(1).max(5),
  traits: z.array(z.string()),
  icon: z.string(),
  splash: z.string(),
  plannerCode: z.number().int().optional(),
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

export const traitBreakpointSchema = z.object({
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
  augments: z.array(augmentSchema),
});
export type SetData = z.infer<typeof setDataSchema>;

export const manifestSchema = z.object({
  generatedAt: z.string(),
  patches: z.record(
    patchSchema,
    z.object({
      version: z.string(),
      sets: z.array(z.number().int()),
    }),
  ),
});
export type Manifest = z.infer<typeof manifestSchema>;

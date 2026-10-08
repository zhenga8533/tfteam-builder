import { isItemKind, ITEM_KINDS } from "@/lib/data/constants";
import type { Augment, AugmentTier, Champion, Item, ItemKind } from "@/lib/data/schema";
import { matches, numberParam, stringParam } from "@/lib/search";
import { isAugmentTier } from "./styles";

/** Champion search, cost and trait filters, kept in the URL (the champion list and tier list). */
export interface ChampionFilters {
  q?: string;
  cost?: number;
  trait?: string;
}

export const parseChampionFilters = (search: Record<string, unknown>): ChampionFilters => ({
  q: stringParam(search.q),
  cost: numberParam(search.cost),
  trait: stringParam(search.trait),
});

export const matchesChampionFilters = (champion: Champion, { q, cost, trait }: ChampionFilters) =>
  matches(champion.name, q) &&
  (cost === undefined || champion.cost === cost) &&
  (!trait || champion.traits.includes(trait));

/** Item search and category, for lists of items or item builds (champion pages, the Explorer). */
export interface ItemFilters {
  q?: string;
  kind?: ItemKind;
}

export const parseItemFilters = (search: Record<string, unknown>): ItemFilters => ({
  q: stringParam(search.q),
  kind: isItemKind(search.kind) ? search.kind : undefined,
});

/**
 * Whether an item, or a build of several, passes: the search matches one of its items, and the "completed" category
 * means only completed items (a standard build) while any other means the build includes one (e.g. an emblem).
 */
export const matchesItemFilters = (items: Item[], { q, kind }: ItemFilters) =>
  (!q || items.some((item) => matches(item.name, q))) &&
  (!kind ||
    (kind === "completed" ? items.every((item) => item.kind === kind) : items.some((item) => item.kind === kind)));

/** The categories among `items`, in the usual order. */
export const itemKindsIn = (items: Item[]) => ITEM_KINDS.filter((kind) => items.some((item) => item.kind === kind));

/** Augment search and tier filters, kept in the URL (the augment list and tier list). */
export interface AugmentFilters {
  q?: string;
  tier?: AugmentTier;
}

export function parseAugmentFilters(search: Record<string, unknown>): AugmentFilters {
  const tier = numberParam(search.tier);
  return { q: stringParam(search.q), tier: isAugmentTier(tier) ? tier : undefined };
}

export const matchesAugmentFilters = (augment: Augment, { q, tier }: AugmentFilters) =>
  matches(augment.name, q) && (tier === undefined || augment.tier === tier);

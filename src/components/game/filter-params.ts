import type { Augment, AugmentTier, Champion } from "@/lib/data/schema";
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

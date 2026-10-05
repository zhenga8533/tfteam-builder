import { listParam, matches, stringParam } from "@/lib/search";

/** The comp tier list's filters, kept in the URL. Every picked champion and trait must be in a comp. */
export interface CompFilters {
  q?: string;
  /** Comps that field all of these champions. */
  champions?: string[];
  /** Comps that run all of these traits, at any breakpoint. */
  traits?: string[];
}

export function parseCompFilters(search: Record<string, unknown>): CompFilters {
  return {
    q: stringParam(search.q),
    champions: listParam(search.champions),
    traits: listParam(search.traits),
  };
}

export const hasCompFilters = ({ q, champions, traits }: CompFilters) =>
  Boolean(q || champions?.length || traits?.length);

/** Whether a comp, given as its name, champions and traits, passes the filters. */
export function passesCompFilters(
  comp: { name: string; units: string[]; traits: string[] },
  { q, champions = [], traits = [] }: CompFilters,
  championName: (apiName: string) => string,
): boolean {
  const textMatch = matches(comp.name, q) || comp.units.some((apiName) => matches(championName(apiName), q));
  return (
    textMatch &&
    champions.every((apiName) => comp.units.includes(apiName)) &&
    traits.every((trait) => comp.traits.includes(trait))
  );
}

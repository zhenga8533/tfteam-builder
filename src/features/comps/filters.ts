import { listParam, matches, stringParam } from "@/lib/search";
import { MAX_CARRIES } from "@/lib/game/comp-signature";

/** The comp tier list's filters, kept in the URL. Every picked champion and trait must be in a comp. */
export interface CompFilters {
  q?: string;
  /** Comps that field all of these champions… */
  champions?: string[];
  /** …with these of them among their carries. */
  carries?: string[];
  /** Comps that run all of these traits, at any breakpoint. */
  traits?: string[];
}

export function parseCompFilters(search: Record<string, unknown>): CompFilters {
  const champions = listParam(search.champions);
  const carries = listParam(search.carries)?.filter((apiName) => champions?.includes(apiName));
  return {
    q: stringParam(search.q),
    champions,
    carries: carries?.length ? carries : undefined,
    traits: listParam(search.traits),
  };
}

export const hasCompFilters = ({ q, champions, traits }: CompFilters) =>
  Boolean(q || champions?.length || traits?.length);

/** Comps have at most this many carries, so asking for more as carries can't match anything. */
export const tooManyCarries = ({ carries }: CompFilters) => (carries?.length ?? 0) > MAX_CARRIES;

/** Whether a comp, given as its name, units (with carries marked) and traits, passes the filters. */
export function passesCompFilters(
  comp: { name: string; units: { apiName: string; carry: boolean }[]; traits: string[] },
  { q, champions = [], carries = [], traits = [] }: CompFilters,
  championName: (apiName: string) => string,
): boolean {
  const textMatch = matches(comp.name, q) || comp.units.some((unit) => matches(championName(unit.apiName), q));
  const championsMatch = champions.every((apiName) =>
    comp.units.some((unit) => unit.apiName === apiName && (!carries.includes(apiName) || unit.carry)),
  );
  return textMatch && championsMatch && traits.every((trait) => comp.traits.includes(trait));
}

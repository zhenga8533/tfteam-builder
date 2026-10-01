import type { Champion } from "@/lib/data/schema";

/** The shop champion and every form that shares it with `champion` (e.g. all Lux forms), excluding itself. */
export function otherForms(champion: Champion, champions: Champion[]): Champion[] {
  const base = champion.formOf ?? champion.apiName;
  return champions.filter(
    (other) => other.apiName !== champion.apiName && (other.apiName === base || other.formOf === base),
  );
}

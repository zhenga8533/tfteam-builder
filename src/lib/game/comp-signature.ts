import type { Trait } from "@/lib/data/schema";
import { STYLE_RANK, type TraitStyle } from "./traits";

const MAX_CARRIES = 2;
const CORE_TRAITS = 2;

/** A trait that only ever needs one unit (e.g. a champion's unique trait) says nothing about the comp. */
export const isUniqueTrait = (trait: Trait) => trait.breakpoints.every((breakpoint) => breakpoint.minUnits <= 1);

export interface CarryCandidate {
  apiName: string;
  items: number;
  cost: number;
}

/** Units holding 3 items (or 2 when nobody has 3), most expensive first, at most two. */
export function pickCarries(units: CarryCandidate[]): string[] {
  const most = Math.max(0, ...units.map((unit) => unit.items));
  if (most < 2) return [];
  return [
    ...new Set(
      units
        .filter((unit) => unit.items === most)
        .sort((a, b) => b.cost - a.cost || a.apiName.localeCompare(b.apiName))
        .map((unit) => unit.apiName),
    ),
  ]
    .slice(0, MAX_CARRIES)
    .sort();
}

export interface ActiveTrait {
  apiName: string;
  style: TraitStyle;
  count: number;
}

/** The two traits defining a board: highest style, then most units; unique traits excluded. */
export function pickCoreTraits(traits: ActiveTrait[]): string[] {
  return [...traits]
    .sort(
      (a, b) => STYLE_RANK[b.style] - STYLE_RANK[a.style] || b.count - a.count || a.apiName.localeCompare(b.apiName),
    )
    .slice(0, CORE_TRAITS)
    .map((trait) => trait.apiName)
    .sort();
}

/** Groups boards into comps: same carries and same core traits (breakpoints aside). */
export const compSignature = (carries: string[], coreTraits: string[]) =>
  `${carries.join("+")}|${coreTraits.join("+")}`;

/** Short stable ID for a signature (FNV-1a), used in comp URLs. */
export function compId(signature: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < signature.length; i++) {
    hash ^= signature.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

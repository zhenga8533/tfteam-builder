import type { Trait } from "@/lib/data/schema";
import type { ExplorerFilter } from "@/lib/explorer/engine";

/**
 * Explorer filters for the boards behind a comp signature (`carries|coreTraits`, see `compSignature`): its carries,
 * and its core traits active at any breakpoint, since signatures leave breakpoints aside.
 */
export function signatureFilters(signature: string, traitsByApi: Map<string, Trait>): ExplorerFilter[] {
  const [carries = "", traits = ""] = signature.split("|");
  return [
    ...carries
      .split("+")
      .filter(Boolean)
      .map((unit): ExplorerFilter => ({ type: "unit", unit })),
    ...traits.split("+").flatMap((apiName): ExplorerFilter[] => {
      const minUnits = traitsByApi.get(apiName)?.breakpoints[0]?.minUnits;
      return minUnits ? [{ type: "trait", trait: apiName, minUnits }] : [];
    }),
  ];
}

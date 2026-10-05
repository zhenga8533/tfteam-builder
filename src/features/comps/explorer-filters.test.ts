import { describe, expect, it } from "vitest";
import type { Trait } from "@/lib/data/schema";
import { signatureFilters } from "./explorer-filters";

const trait = (apiName: string, minUnits: number) => ({ apiName, breakpoints: [{ minUnits }] }) as unknown as Trait;
const traits = new Map([trait("Blossom", 3), trait("Invoker", 2)].map((entry) => [entry.apiName, entry]));

describe("signatureFilters", () => {
  it("filters by the carries and the core traits at their first breakpoint", () => {
    expect(signatureFilters("Ahri+Ashe|Blossom+Invoker", traits)).toEqual([
      { type: "unit", unit: "Ahri" },
      { type: "unit", unit: "Ashe" },
      { type: "trait", trait: "Blossom", minUnits: 3 },
      { type: "trait", trait: "Invoker", minUnits: 2 },
    ]);
  });

  it("skips empty parts and traits the game data doesn't have", () => {
    expect(signatureFilters("|Blossom+Gone", traits)).toEqual([{ type: "trait", trait: "Blossom", minUnits: 3 }]);
  });
});

import { describe, expect, it } from "vitest";
import type { Trait } from "@/lib/data/schema";
import { parseTraitKey, traitBreakpoint, traitKey } from "./traits";

const blossom = { apiName: "Blossom", breakpoints: [{ minUnits: 3 }, { minUnits: 5 }] } as Trait;
const traitsByApi = new Map([[blossom.apiName, blossom]]);

describe("trait keys", () => {
  it("round-trips a breakpoint", () => {
    expect(traitKey("Blossom", 5)).toBe("Blossom:5");
    expect(parseTraitKey("Blossom:5")).toEqual({ apiName: "Blossom", minUnits: 5 });
  });

  it("finds the trait and breakpoint a key names, or null", () => {
    expect(traitBreakpoint("Blossom:5", traitsByApi)).toEqual({ trait: blossom, breakpoint: { minUnits: 5 } });
    expect(traitBreakpoint("Blossom:4", traitsByApi)).toBeNull();
    expect(traitBreakpoint("Gone:5", traitsByApi)).toBeNull();
  });
});

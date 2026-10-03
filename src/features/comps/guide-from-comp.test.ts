import { describe, expect, it } from "vitest";
import type { AutoComp } from "@/lib/data/schema";
import { guideFromComp } from "./guide-from-comp";

const comp = (star: number, level: number) =>
  ({
    name: "Blossom Ahri",
    carries: ["Ahri"],
    tier: "A",
    level,
    units: [
      { apiName: "Ahri", star, items: [], frequency: 1 },
      { apiName: "Sett", star: 3, items: [], frequency: 1 },
    ],
  }) as unknown as AutoComp;

describe("guideFromComp", () => {
  it("fills in the name, carries and tier", () => {
    expect(guideFromComp(comp(2, 8))).toEqual({
      name: "Blossom Ahri",
      carries: ["Ahri"],
      tier: "A",
      playstyle: "Fast 8",
    });
  });

  it("guesses the playstyle from 3-star carries and the final level", () => {
    expect(guideFromComp(comp(3, 8)).playstyle).toBe("Reroll");
    expect(guideFromComp(comp(2, 9)).playstyle).toBe("Fast 9");
  });
});

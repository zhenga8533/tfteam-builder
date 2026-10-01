import { describe, expect, it } from "vitest";
import type { Champion, Trait } from "@/lib/data/schema";
import { autofill, traitLadder, type PlannerData } from "./trait-planner";

const champion = (apiName: string, traits: string[], cost = 1, formOf?: string) =>
  ({ apiName, name: apiName, cost, traits, ...(formOf && { formOf }) }) as Champion;
const trait = (apiName: string, breakpoints: number[], style = 1) =>
  ({ apiName, name: apiName, breakpoints: breakpoints.map((minUnits) => ({ minUnits, style })) }) as Trait;

const champions = [
  champion("A1", ["Mage"]),
  champion("A2", ["Mage", "Guard"]),
  champion("A3", ["Mage"], 3),
  champion("B1", ["Guard"]),
  champion("Solo", ["Unique"]),
  champion("Lux", ["Avatar"], 5),
  champion("LuxMage", ["Mage", "Avatar"], 5, "Lux"),
];
const data: PlannerData = {
  champions,
  championsByApi: new Map(champions.map((entry) => [entry.apiName, entry])),
  traitsByApi: new Map(
    [trait("Mage", [2, 4]), trait("Guard", [2]), trait("Unique", [1], 4), trait("Avatar", [1], 4)].map((entry) => [
      entry.apiName,
      entry,
    ]),
  ),
  itemsByApi: new Map(),
};
const units = (...names: string[]) => names.map((apiName) => ({ apiName, items: [] }));

describe("trait planner", () => {
  it("lists the next breakpoint and who reaches it, best addition first", () => {
    const [mage] = traitLadder(units("A1"), data).filter((step) => step.trait.apiName === "Mage");
    expect(mage).toMatchObject({ count: 1, next: 2 });
    // LuxMage reaches 2 Mage and also activates its unique Avatar trait, so it adds the most.
    expect(mage!.candidates.map((entry) => entry.apiName)).toEqual(["LuxMage", "A2", "A3"]);
  });

  it("fills open slots for the strongest traits and fields only one form of a champion", () => {
    const picks = autofill(units("Lux"), 3, data).map((entry) => entry.apiName);
    expect(picks).toHaveLength(3);
    expect(picks).not.toContain("LuxMage");
    // 2 Mage + 2 Guard; A3 ties A1 on traits and wins on cost, the default strength.
    expect(new Set(picks)).toEqual(new Set(["A2", "A3", "B1"]));
  });

  it("stops when no champion is left to add", () => {
    expect(autofill(units(...champions.map((entry) => entry.apiName)), 2, data)).toEqual([]);
  });
});

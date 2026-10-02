import { describe, expect, it } from "vitest";
import type { Champion, Trait } from "@/lib/data/schema";
import { autofill, autofillOptions, defaultMaxCost, traitLadder, type PlannerData } from "./trait-planner";
import { computeTraits } from "./traits";

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

  it("spreads traits for most traits, goes deep for levels, and builds around a chosen trait", () => {
    const pool = [
      ...["D1", "D2", "D3", "D4"].map((name) => champion(name, ["Deep"])),
      champion("A1", ["WideA"]),
      champion("A2", ["WideA"]),
      champion("B1", ["WideB"]),
      champion("B2", ["WideB"]),
    ];
    const deep: PlannerData = {
      champions: pool,
      championsByApi: new Map(pool.map((entry) => [entry.apiName, entry])),
      traitsByApi: new Map(
        [
          {
            ...trait("Deep", [2, 4]),
            breakpoints: [
              { minUnits: 2, style: 1 },
              { minUnits: 4, style: 5 },
            ],
          },
          trait("WideA", [2]),
          trait("WideB", [2]),
        ].map((entry) => [entry.apiName, entry as Trait]),
      ),
      itemsByApi: new Map(),
    };
    const names = (goal: Parameters<typeof autofill>[3]) =>
      new Set(autofill([], 4, deep, goal).map((entry) => entry.apiName));
    // Two bronze traits beat one gold trait on count (any two pairs will do)…
    const most = autofill([], 4, deep, { mode: "most" }).map((entry) => ({ apiName: entry.apiName, items: [] }));
    const active = computeTraits(most, deep.championsByApi, deep.traitsByApi, deep.itemsByApi).filter(
      (state) => state.activeIndex >= 0,
    );
    expect(active.map((state) => state.style)).toEqual(["bronze", "bronze"]);
    // …but gold (3) beats two bronzes (2) on levels.
    expect(names({ mode: "levels" })).toEqual(new Set(["D1", "D2", "D3", "D4"]));
    // Building around WideA keeps both of its units even in levels mode.
    const around = names({ mode: "levels", around: ["WideA"] });
    expect(around.has("A1") && around.has("A2")).toBe(true);
  });

  it("skips champions above the cost limit, which defaults by level", () => {
    const picks = autofill(units(), 3, data, { mode: "levels" }, { maxCost: 1 });
    expect(picks.every((entry) => entry.cost <= 1)).toBe(true);
    expect([defaultMaxCost(4), defaultMaxCost(7), defaultMaxCost(9)]).toEqual([3, 4, 5]);
  });

  it("offers distinct suggestions, each at least two champions apart", () => {
    const options = autofillOptions(units(), 3, data, { mode: "most" }, { count: 3 });
    expect(options.length).toBeGreaterThan(1);
    for (const [i, a] of options.entries()) {
      for (const b of options.slice(i + 1)) {
        const names = new Set(a.map((entry) => entry.apiName));
        expect(b.filter((entry) => !names.has(entry.apiName)).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("gets every chosen trait to a breakpoint before taking one deeper", () => {
    const picks = autofill(units(), 3, data, { mode: "most", around: ["Mage", "Guard"] });
    const states = computeTraits(
      picks.map((entry) => ({ apiName: entry.apiName, items: [] })),
      data.championsByApi,
      data.traitsByApi,
      data.itemsByApi,
    );
    // Three slots can't take Mage to 4, but they can reach 2 in both, which beats three Mages.
    const reached = (apiName: string) => states.find((state) => state.trait.apiName === apiName)?.activeIndex ?? -1;
    expect([reached("Mage"), reached("Guard")]).toEqual([0, 0]);
  });

  it("never adds avoided champions, their forms, or champions with avoided traits", () => {
    const picks = autofill(units(), 4, data, { mode: "most", avoidChampions: ["Lux", "A2"], avoidTraits: ["Guard"] });
    const names = picks.map((entry) => entry.apiName);
    expect(names).not.toContain("Lux");
    expect(names).not.toContain("LuxMage");
    expect(names).not.toContain("A2");
    expect(names).not.toContain("B1");
  });

  it("stops when no champion is left to add", () => {
    expect(autofill(units(...champions.map((entry) => entry.apiName)), 2, data)).toEqual([]);
  });
});

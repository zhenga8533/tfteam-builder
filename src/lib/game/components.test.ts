import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/data/schema";
import { bestBuildable, buildableItems, canBuild, componentValues } from "./components";

const item = (apiName: string, composition: string[] = []) =>
  ({ apiName, composition, kind: composition.length ? "completed" : "component" }) as unknown as Item;
const items = [
  item("Sword"),
  item("Rod"),
  item("Tear"),
  item("IE", ["Sword", "Sword"]),
  item("JG", ["Rod", "Sword"]),
  item("BB", ["Tear", "Tear"]),
  item("Shojin", ["Sword", "Tear"]),
];
const byApi = new Map(items.map((entry) => [entry.apiName, entry]));

describe("component planner", () => {
  const counts = { Sword: 2, Rod: 1, Tear: 1 };

  it("lists every item the components can make on its own", () => {
    expect(buildableItems(items, counts).map((entry) => entry.apiName)).toEqual(["IE", "JG", "Shojin"]);
  });

  it("checks that several items can be built at once", () => {
    expect(canBuild([byApi.get("JG")!, byApi.get("Shojin")!], counts)).toBe(true);
    expect(canBuild([byApi.get("IE")!, byApi.get("JG")!], counts)).toBe(false);
  });

  it("picks the best build the components allow", () => {
    const builds = [{ items: ["IE", "JG"] }, { items: ["BB", "JG"] }, { items: ["JG", "Shojin"] }];
    expect(bestBuildable(builds, byApi, counts, 2)).toEqual({ items: ["JG", "Shojin"] });
    expect(bestBuildable(builds, byApi, { Sword: 1 }, 2)).toBeNull();
  });
});

describe("component values", () => {
  it("ranks components by the play-weighted placement of what they build", () => {
    const lines = {
      IE: { avg: 4.5, games: 100, tier: "C" },
      JG: { avg: 3.5, games: 300, tier: "S" },
      Shojin: { avg: 4.0, games: 100 },
    };
    const values = componentValues(items, lines);
    expect(values.map((value) => value.component.apiName)).toEqual(["Rod", "Sword", "Tear"]);
    // Sword builds IE, JG and Shojin: (4.5×100 + 3.5×300 + 4×100) / 500 = 3.8.
    expect(values.find((value) => value.component.apiName === "Sword")?.avg).toBeCloseTo(3.8);
    expect(values.find((value) => value.component.apiName === "Sword")?.strong.map((item) => item.apiName)).toEqual([
      "JG",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/data/schema";
import { bestBuildable, buildableItems, canBuild } from "./components";

const item = (apiName: string, composition: string[] = []) => ({ apiName, composition }) as unknown as Item;
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

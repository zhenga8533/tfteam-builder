import { describe, expect, it } from "vitest";
import type { SetData } from "../../src/lib/data/schema.ts";
import { confirmSetItems } from "./set-items.ts";

const item = (apiName: string, kind: string) => ({ apiName, kind });
const data = {
  items: [item("Sword", "completed"), item("Potion", "set"), item("Token", "set")],
  itemAliases: { PotionCopy: "Potion", TokenCopy: "Token", SwordCopy: "Sword" },
} as unknown as SetData;

describe("confirmSetItems", () => {
  it("keeps the set items boards hold, and every other kind", () => {
    const confirmed = confirmSetItems(data, new Set(["Potion"]));
    expect(confirmed.items.map((entry) => entry.apiName)).toEqual(["Sword", "Potion"]);
    expect(confirmed.itemAliases).toEqual({ PotionCopy: "Potion", SwordCopy: "Sword" });
  });

  it("drops every set item without stats, and leaves data alone when nothing changes", () => {
    expect(confirmSetItems(data, new Set()).items.map((entry) => entry.apiName)).toEqual(["Sword"]);
    expect(confirmSetItems(data, new Set(["Potion", "Token"]))).toBe(data);
  });
});

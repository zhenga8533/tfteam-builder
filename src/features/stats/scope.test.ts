import { describe, expect, it, vi } from "vitest";
import { parseRank, parseStatsScope, scopeChoices } from "./scope";

describe("stats scope", () => {
  it("keeps only valid rank floors and regions from the URL", () => {
    expect(parseStatsScope({ rank: "master", region: "asia" })).toEqual({ rank: "master", region: "asia" });
    expect(parseStatsScope({ rank: "wood", region: "mars" })).toEqual({
      rank: undefined,
      region: undefined,
      patch: undefined,
    });
  });

  it("reads the patch as a string, even when the URL makes it a number", () => {
    expect(parseStatsScope({ patch: "18.4b" }).patch).toBe("18.4b");
    expect(parseStatsScope({ patch: 18.4 }).patch).toBe("18.4");
    expect(parseStatsScope({ patch: { x: 1 } }).patch).toBeUndefined();
  });

  it("keeps only a valid rank floor", () => {
    expect(parseRank("emerald")).toBe("emerald");
    expect(parseRank("wood")).toBeUndefined();
  });

  it("keeps one of rank, region and patch at a time", () => {
    const update = vi.fn();
    const choices = scopeChoices(update);
    choices.region.onChange("asia");
    expect(update).toHaveBeenLastCalledWith({ region: "asia", rank: undefined, patch: undefined });
    choices.rank.onChange("diamond");
    expect(update).toHaveBeenLastCalledWith({ rank: "diamond", region: undefined, patch: undefined });
    choices.patch.onChange("18.4");
    expect(update).toHaveBeenLastCalledWith({ patch: "18.4", rank: undefined, region: undefined });
  });
});

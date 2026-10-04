import { describe, expect, it, vi } from "vitest";
import { parseStatsScope, scopeChoices } from "./scope";

describe("stats scope", () => {
  it("keeps only valid rank floors and regions from the URL", () => {
    expect(parseStatsScope({ rank: "master", region: "asia" })).toEqual({ rank: "master", region: "asia" });
    expect(parseStatsScope({ rank: "wood", region: "mars" })).toEqual({ rank: undefined, region: undefined });
  });

  it("clears the region when a rank is picked, and the other way round", () => {
    const update = vi.fn();
    const choices = scopeChoices({ rank: "master" }, update);
    choices.region.onChange("asia");
    expect(update).toHaveBeenLastCalledWith({ region: "asia", rank: undefined });
    choices.rank.onChange("diamond");
    expect(update).toHaveBeenLastCalledWith({ rank: "diamond", region: undefined });
  });
});

import { describe, expect, it } from "vitest";
import { addBoard, emptyCounters, isRankedStandard, matchToRows, mergeCounters } from "./aggregate.ts";
import { match } from "./fixtures.ts";

describe("aggregation", () => {
  it("keeps only standard ranked games", () => {
    expect(isRankedStandard(match())).toBe(true);
    expect(isRankedStandard(match({ queue_id: 1090 }))).toBe(false);
    expect(isRankedStandard(match({ tft_game_type: "pairs" }))).toBe(false);
  });

  it("stores one row per player with only active traits", () => {
    expect(matchToRows(match(), "diamond")).toEqual([
      [
        "NA1_1",
        1_790_000_000,
        "diamond",
        1,
        9,
        [
          ["TFT18_Ahri", 2, ["TFT_Item_BlueBuff", "TFT_Item_BlueBuff"]],
          ["TFT18_Ahri", 1, []],
        ],
        [["TFT18_Blossom", 2, 5]],
        // JSON drops the undefined fields when stored.
        { lastRound: undefined, companion: undefined },
      ],
      ["NA1_1", 1_790_000_000, "diamond", 6, 8, [["TFT18_Ahri", 1, []]], [], { lastRound: 27, companion: "ossia-1" }],
    ]);
  });

  it("counts units, traits, items and a unit's items once per board", () => {
    const counters = emptyCounters();
    for (const row of matchToRows(match(), "diamond")) addBoard(counters, row);
    expect(counters.matches).toBe(1);
    expect(counters.boards).toBe(2);
    expect(counters.units["TFT18_Ahri"]).toEqual([2, 7, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0]);
    expect(counters.unitStars["TFT18_Ahri|1"]!.slice(0, 4)).toEqual([2, 7, 1, 1]);
    // The winner built Blue Buff twice; the board counts once.
    expect(counters.items["TFT_Item_BlueBuff"]).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
    expect(counters.unitItems["TFT18_Ahri|TFT_Item_BlueBuff"]!.slice(0, 4)).toEqual([1, 1, 1, 1]);
    expect(counters.traits).toEqual({ "TFT18_Blossom|2": [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] });
  });

  it("merges counters by summing", () => {
    const a = emptyCounters();
    const b = emptyCounters();
    for (const row of matchToRows(match(), "diamond")) {
      addBoard(a, row);
      addBoard(b, row);
    }
    const merged = mergeCounters(emptyCounters(), a);
    mergeCounters(merged, b);
    expect(merged.matches).toBe(2);
    expect(merged.units["TFT18_Ahri"]).toEqual([4, 14, 2, 2, 2, 0, 0, 0, 0, 2, 0, 0]);
  });
});

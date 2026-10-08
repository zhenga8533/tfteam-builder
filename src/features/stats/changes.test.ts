import { describe, expect, it } from "vitest";
import type { StatLine } from "@/lib/data/schema";
import { arrivals, changeEntries, placementMovers, playMovers } from "./changes";

const line = (avg: number, play: number): StatLine => ({ games: 500, avg, score: avg, top4: 0.5, win: 0.1, play });

describe("patch changes", () => {
  const entries = changeEntries(
    { Ahri: line(4, 0.3), Sett: line(4.6, 0.1), Zyra: line(4.4, 0.2), New: line(4.5, 0.05) },
    { Ahri: -0.4, Sett: 0.3, Zyra: 0.02 },
    { Ahri: [4.4, 0.2, 400], Sett: [4.3, 0.15, 400], Zyra: [4.38, 0.2, 400], Gone: [4.5, 0.08, 300] },
  );

  it("ranks placement moves, leaving out tiny ones", () => {
    const { better, worse } = placementMovers(entries);
    expect(better.map((entry) => entry.key)).toEqual(["Ahri"]);
    expect(worse.map((entry) => entry.key)).toEqual(["Sett"]);
  });

  it("ranks play rate changes for entries on both patches", () => {
    const { pickedUp, droppedOff } = playMovers(entries);
    expect(pickedUp.map((entry) => entry.key)).toEqual(["Ahri"]);
    expect(droppedOff.map((entry) => entry.key)).toEqual(["Sett"]);
  });

  it("finds entries new on the shown patch and gone from it", () => {
    const { added, gone } = arrivals(entries);
    expect(added.map((entry) => entry.key)).toEqual(["New"]);
    expect(gone.map((entry) => entry.key)).toEqual(["Gone"]);
  });
});

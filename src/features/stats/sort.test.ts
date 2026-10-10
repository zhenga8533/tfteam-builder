import { describe, expect, it } from "vitest";
import type { StatLine } from "@/lib/data/schema";
import { formatRate, orderEntries, rankByStat } from "./sort";

const line = (stats: Partial<StatLine>): StatLine => ({
  games: 1000,
  avg: 4.5,
  score: 4.5,
  top4: 0.5,
  win: 0.125,
  play: 0.1,
  ...stats,
});

describe("rankByStat", () => {
  it("puts the highest value first, breaking ties by score", () => {
    const entries = [
      { key: "a", line: line({ play: 0.1, score: 4.2 }) },
      { key: "b", line: line({ play: 0.3 }) },
      { key: "c", line: line({ play: 0.1, score: 4 }) },
    ];
    expect(rankByStat(entries, (entry) => entry.line, "play").map((entry) => entry.key)).toEqual(["b", "c", "a"]);
  });
});

describe("orderEntries", () => {
  const entries = [
    { key: "a", line: line({ score: 4.4, top4: 0.55, play: 0.2 }) },
    { key: "none", line: undefined },
    { key: "low", line: line({ games: 12, score: 4.3, top4: 0.75, play: 0.01 }) },
    { key: "b", line: line({ score: 4.1, top4: 0.6, play: 0.1 }) },
  ];
  const keys = (sorted: typeof entries) => sorted.map((entry) => entry.key);

  it("puts the best placement or the most played first, and entries without stats last", () => {
    expect(keys(orderEntries(entries, (entry) => entry.line, "avg"))).toEqual(["b", "low", "a", "none"]);
    expect(keys(orderEntries(entries, (entry) => entry.line, "play"))).toEqual(["a", "b", "low", "none"]);
  });

  it("puts low samples after the rest by top 4 rate", () => {
    expect(keys(orderEntries(entries, (entry) => entry.line, "top4"))).toEqual(["b", "a", "none", "low"]);
  });
});

describe("formatRate", () => {
  it("shows small play rates with a decimal", () => {
    expect(formatRate(line({ play: 0.034 }), "play")).toBe("3.4%");
    expect(formatRate(line({ top4: 0.567 }), "top4")).toBe("57%");
  });
});

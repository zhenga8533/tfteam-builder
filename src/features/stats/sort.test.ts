import { describe, expect, it } from "vitest";
import type { StatLine } from "@/lib/data/schema";
import { formatStat, orderEntries, parseStatSort, rankByStat } from "./sort";

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

describe("parseStatSort", () => {
  it("accepts the stats a list can rank by", () => {
    expect(parseStatSort("win")).toBe("win");
    expect(parseStatSort("avg")).toBeUndefined();
  });
});

describe("formatStat", () => {
  it("shows small play rates with a decimal and win rates to one decimal", () => {
    expect(formatStat(line({ play: 0.034 }), "play")).toBe("3.4%");
    expect(formatStat(line({ win: 0.1567 }), "win")).toBe("15.7%");
  });
});

describe("orderEntries", () => {
  const entries = [
    { key: "a", line: line({ score: 4.4, play: 0.2 }) },
    { key: "none", line: undefined },
    { key: "b", line: line({ score: 4.1, play: 0.1 }) },
  ];
  const keys = (sorted: typeof entries) => sorted.map((entry) => entry.key);

  it("puts the best placement or the most played first, and entries without stats last", () => {
    expect(keys(orderEntries(entries, (entry) => entry.line, "avg"))).toEqual(["b", "a", "none"]);
    expect(keys(orderEntries(entries, (entry) => entry.line, "play"))).toEqual(["a", "b", "none"]);
  });
});

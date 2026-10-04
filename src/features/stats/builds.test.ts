import type { Champion, SetStats } from "@/lib/data/schema";
import { describe, expect, it } from "vitest";
import { bestBuild, bestHolders, nextItems, remainder, type Build } from "./builds";

const build = (items: string[], delta: number): Build => ({
  items,
  delta,
  games: 100,
  avg: 4 + delta,
  score: 4 + delta,
  top4: 0.5,
  win: 0.1,
  play: 0.1,
});

describe("builds", () => {
  it("matches chosen items as a multiset", () => {
    expect(remainder(["A", "A", "B"], ["A"])).toEqual(["A", "B"]);
    expect(remainder(["A", "B"], ["A", "A"])).toBeNull();
  });

  it("ranks the next item given what's already chosen", () => {
    const builds = [
      build(["A"], -0.1),
      build(["B"], 0.2),
      build(["A", "B"], -0.3),
      build(["A", "A"], -0.5),
      build(["B", "C"], -0.9),
      build(["A", "B", "C"], -0.4),
    ];
    expect(nextItems(builds, []).map(({ item }) => item)).toEqual(["A", "B"]);
    expect(nextItems(builds, ["A"]).map(({ item }) => item)).toEqual(["A", "B"]);
    expect(nextItems(builds, ["B", "A"]).map(({ item }) => item)).toEqual(["C"]);
  });
});

describe("bestBuild", () => {
  it("picks the best full build that keeps the chosen items", () => {
    const builds = [build(["A", "B", "C"], -0.2), build(["A", "B", "D"], -0.6), build(["B", "C", "E"], -0.9)];
    expect(bestBuild(builds, ["A"], 3)?.items).toEqual(["A", "B", "D"]);
    expect(bestBuild(builds, [], 3)?.items).toEqual(["B", "C", "E"]);
    expect(bestBuild(builds, ["Z"], 3)).toBeNull();
  });
});

describe("bestHolders", () => {
  const champion = (apiName: string) => [apiName, { apiName } as Champion] as const;
  const line = (item: string, score: number) => ({ item, score }) as SetStats["bestItems"][string][number];
  const bestItems = {
    Ahri: [line("BlueBuff", 4.2)],
    Ashe: [line("BlueBuff", 3.9), line("Rageblade", 3.5)],
    Gone: [line("BlueBuff", 3.0)],
  };

  it("ranks the known champions holding an item, best first", () => {
    const holders = bestHolders("BlueBuff", bestItems, new Map([champion("Ahri"), champion("Ashe")]), 5);
    expect(holders.map((holder) => holder.champion.apiName)).toEqual(["Ashe", "Ahri"]);
    expect(bestHolders("BlueBuff", bestItems, new Map([champion("Ahri"), champion("Ashe")]), 1)).toHaveLength(1);
  });
});

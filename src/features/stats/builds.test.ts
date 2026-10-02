import { describe, expect, it } from "vitest";
import { bestBuild, type Build, nextItems, remainder } from "./builds";

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

import { describe, expect, it } from "vitest";
import type { SetData } from "../../src/lib/data/schema.ts";
import type { BoardRow } from "../store/types.ts";
import { BoardResolver } from "./boards.ts";
import { ChampionAccumulator, itemSubsets, MIN_CHAMPION_GAMES } from "./champion-stats.ts";

const data = {
  number: 18,
  champions: [{ apiName: "Ahri" }, { apiName: "Sett" }, { apiName: "Lux" }],
  traits: [
    {
      apiName: "Blossom",
      breakpoints: [
        { minUnits: 3, style: 1 },
        { minUnits: 5, style: 3 },
      ],
    },
  ],
  items: [
    { apiName: "JG", kind: "completed" },
    { apiName: "BB", kind: "completed" },
    { apiName: "Rod", kind: "component" },
  ],
  itemAliases: { DA_JG: "JG" },
  championAliases: { Lux_Coven: "Lux" },
} as unknown as SetData;

const board = (placement: number, units: BoardRow[5], traits: BoardRow[6] = []): BoardRow => [
  "NA1_1",
  0,
  "diamond",
  placement,
  8,
  units,
  traits,
  {},
];

describe("itemSubsets", () => {
  it("lists every distinct sub-multiset", () => {
    expect(itemSubsets(["A", "A", "B"]).map((subset) => subset.join("+"))).toEqual(["A", "A+A", "B", "A+B", "A+A+B"]);
  });
});

describe("ChampionAccumulator", () => {
  // Ahri with JG+BB places well; Ahri with BB only places poorly. Sett is always alongside.
  const accumulator = new ChampionAccumulator();
  const resolver = new BoardResolver(data);
  const repeat = (count: number, row: BoardRow) => {
    for (let i = 0; i < count; i++) accumulator.add(resolver.board(row));
  };
  repeat(
    MIN_CHAMPION_GAMES.build2,
    board(
      2,
      [
        ["Ahri", 2, ["DA_JG", "BB", "Rod"]],
        ["Sett", 1, []],
      ],
      [["Blossom", 2, 5]],
    ),
  );
  repeat(
    MIN_CHAMPION_GAMES.build1,
    board(7, [
      ["Ahri", 1, ["BB"]],
      ["Sett", 1, []],
      ["Lux_Coven", 1, []],
    ]),
  );
  const results = new Map(accumulator.results().map((stats) => [stats.apiName, stats]));
  const ahri = results.get("Ahri")!;

  it("computes overall and per-star lines", () => {
    expect(ahri.overall.games).toBe(80);
    expect(ahri.stars["2"]?.games).toBe(30);
    expect(ahri.stars["1"]?.games).toBe(50);
  });

  it("counts item subsets per instance, resolving aliases and skipping components", () => {
    const builds = new Map(ahri.builds.map((build) => [build.items.join("+"), build]));
    expect(builds.get("BB")?.games).toBe(80);
    expect(builds.get("BB+JG")?.games).toBe(30);
    // Single JG has 30 games, below the 50-game minimum for single items.
    expect(builds.has("JG")).toBe(false);
    expect([...builds.keys()].some((key) => key.includes("Rod"))).toBe(false);
    expect(builds.get("BB+JG")!.delta).toBeLessThan(0);
  });

  it("finds partners (forms resolved to their base) and trait breakpoints with deltas", () => {
    expect(ahri.partners.map((partner) => [partner.unit, partner.games])).toEqual([
      ["Sett", 80],
      ["Lux", 50],
    ]);
    expect(ahri.partners[1]!.delta).toBeGreaterThan(0);
    // Blossom appears on 30 boards, below the 50-game partner minimum.
    expect(ahri.traits).toEqual([]);
  });
});

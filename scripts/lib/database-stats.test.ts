import { describe, expect, it } from "vitest";
import type { AutoComp, ChampionStats } from "../../src/lib/data/schema.ts";
import type { ResolvedBoard } from "./boards.ts";
import { DatabaseAccumulator, MIN_DATABASE_GAMES } from "./database-stats.ts";

const board = (placement: number, items: string[], traits: string[]): ResolvedBoard => ({
  placement,
  level: 8,
  units: [
    { apiName: "Ahri", star: 2, items },
    { apiName: "Sett", star: 1, items: [] },
  ],
  traits: traits.map((apiName) => ({ apiName, minUnits: 2, style: 1, count: 2 })),
});

describe("DatabaseAccumulator", () => {
  const database = new DatabaseAccumulator();
  const games = MIN_DATABASE_GAMES.pair;
  for (let i = 0; i < games; i++) database.add(board(2, ["Blue", "Gauntlet"], ["Blossom"]));
  for (let i = 0; i < games; i++) database.add(board(6, ["Gauntlet"], []));

  const champions = [
    { apiName: "Ahri", builds: [{ items: ["Gauntlet"], games: 100, avg: 4, score: 4, delta: -0.5 }] },
  ] as unknown as ChampionStats[];
  const comps = [
    { id: "c1", units: [{ apiName: "Ahri", items: ["Blue"] }], traits: [{ trait: "Blossom" }] },
  ] as unknown as AutoComp[];
  const { items, traits } = database.results(champions, comps);
  const gauntlet = items.find((item) => item.apiName === "Gauntlet")!;

  it("compares an item's pairings against the item's own average", () => {
    // Gauntlet averages 4th; with Blue Buff it averaged 2nd.
    expect(gauntlet.pairs).toMatchObject([{ item: "Blue", games, avg: 2, delta: -2 }]);
  });

  it("takes holders from the champions' single-item builds", () => {
    expect(gauntlet.holders).toMatchObject([{ unit: "Ahri", delta: -0.5 }]);
  });

  it("lists units on boards with the trait active, and comps by item and trait", () => {
    const blossom = traits.find((trait) => trait.apiName === "Blossom")!;
    expect(blossom.units.map((unit) => [unit.unit, unit.delta])).toEqual([
      ["Ahri", 0],
      ["Sett", 0],
    ]);
    expect(blossom.comps).toEqual(["c1"]);
    expect(items.find((item) => item.apiName === "Blue")?.comps).toEqual(["c1"]);
  });
});

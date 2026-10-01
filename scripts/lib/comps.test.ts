import { describe, expect, it } from "vitest";
import type { SetData } from "../../src/lib/data/schema.ts";
import { compId, pickCarries } from "../../src/lib/game/comp-signature.ts";
import type { ResolvedBoard } from "./boards.ts";
import { COMP_THRESHOLDS, CompDetector } from "./comps.ts";

const trait = (apiName: string, minUnits: number[], source = "champion") => ({
  apiName,
  name: apiName,
  source,
  breakpoints: minUnits.map((min, i) => ({ minUnits: min, style: [1, 3, 5][i] })),
});

const data = {
  champions: [
    { apiName: "Ahri", name: "Ahri", cost: 4 },
    { apiName: "Sett", name: "Sett", cost: 4 },
    { apiName: "Karma", name: "Karma", cost: 1 },
    { apiName: "Zyra", name: "Zyra", cost: 4 },
  ],
  traits: [trait("Blossom", [3, 5]), trait("Spellweaver", [2, 4]), trait("Brawler", [2, 4]), trait("Unique", [1])],
} as unknown as SetData;

const board = (
  placement: number,
  units: [string, string[]][],
  traits: [string, number, number][],
  level = 8,
): ResolvedBoard => ({
  placement,
  level,
  units: units.map(([apiName, items]) => ({ apiName, star: 2, items })),
  traits: traits.map(([apiName, minUnits, count]) => ({
    apiName,
    minUnits,
    style: minUnits >= 4 ? 3 : 1,
    count,
  })),
});

const ahriBlossom = (placement: number, extra: [string, string[]][] = []) =>
  board(
    placement,
    [["Ahri", ["JG", "BB", "Rab"]], ["Sett", []], ["Karma", ["BB"]], ...extra],
    [
      ["Blossom", 5, 5],
      ["Spellweaver", 2, 2],
      ["Unique", 1, 1],
    ],
  );

describe("comp signatures", () => {
  it("picks 3-item units as carries, falling back to 2 items, most expensive first", () => {
    expect(
      pickCarries([
        { apiName: "Karma", items: 3, cost: 1 },
        { apiName: "Ahri", items: 3, cost: 4 },
        { apiName: "Zyra", items: 3, cost: 4 },
      ]),
    ).toEqual(["Ahri", "Zyra"]);
    expect(pickCarries([{ apiName: "Ahri", items: 1, cost: 4 }])).toEqual([]);
  });

  it("ignores unique traits and has stable IDs", () => {
    const detector = new CompDetector(data);
    expect(detector.signature(ahriBlossom(1))).toBe("Ahri|Blossom+Spellweaver");
    expect(compId("Ahri|Blossom+Spellweaver")).toBe(compId("Ahri|Blossom+Spellweaver"));
    expect(compId("Ahri|Blossom+Spellweaver")).not.toBe(compId("Ahri|Blossom+Brawler"));
  });
});

describe("CompDetector", () => {
  const run = (boards: ResolvedBoard[]) => {
    const detector = new CompDetector(data);
    for (const entry of boards) detector.count(entry);
    for (const entry of boards) detector.add(entry);
    return detector.results();
  };
  const games = COMP_THRESHOLDS.minGames;

  it("keeps comps with enough games and at least one win, and builds their core board", () => {
    const boards = [
      ...Array.from({ length: games }, (_, i) => ahriBlossom(i === 0 ? 1 : 3, i % 3 === 0 ? [["Zyra", []]] : [])),
      // Plenty of games but never won: not a comp.
      ...Array.from({ length: games }, () =>
        board(
          5,
          [["Sett", ["A", "B", "C"]]],
          [
            ["Brawler", 2, 2],
            ["Blossom", 3, 3],
          ],
        ),
      ),
    ];
    const comps = run(boards);
    expect(comps).toHaveLength(1);
    const [comp] = comps;
    expect(comp).toMatchObject({ name: "Blossom Ahri", carries: ["Ahri"], games, level: 8 });
    expect(comp!.units.map((unit) => [unit.apiName, unit.items])).toEqual([
      ["Ahri", ["JG", "BB", "Rab"]],
      ["Sett", []],
      ["Karma", ["BB"]],
    ]);
    expect(comp!.flex).toEqual([{ apiName: "Zyra", frequency: 0.333 }]);
    expect(comp!.traits.map((entry) => [entry.trait, entry.minUnits])).toEqual([
      ["Blossom", 5],
      ["Spellweaver", 2],
      ["Unique", 1],
    ]);
  });

  it("never treats boards without a carry as a comp", () => {
    const noCarry = (placement: number) => board(placement, [["Sett", ["A"]]], [["Brawler", 2, 2]]);
    expect(run(Array.from({ length: games }, (_, i) => noCarry(i === 0 ? 1 : 3)))).toEqual([]);
  });

  it("folds rare variants into a comp with the same carries and a shared core trait", () => {
    const variant = board(
      2,
      [["Ahri", ["JG", "BB", "Rab"]]],
      [
        ["Blossom", 3, 3],
        ["Brawler", 2, 2],
      ],
    );
    const comps = run([...Array.from({ length: games }, (_, i) => ahriBlossom(i === 0 ? 1 : 4)), variant]);
    expect(comps).toHaveLength(1);
    expect(comps[0]!.games).toBe(games + 1);
  });
});

import { describe, expect, it } from "vitest";
import { runQuery, runTotalsQuery, similarBoards } from "./engine";
import { TotalsAccumulator } from "./totals";
import { decodeExplorer, encodeExplorer, type ExplorerBoard } from "./format";

const board = (placement: number, units: [string, number, string[]][], traits: [string, number][], level = 8) => ({
  placement,
  level,
  rank: 0,
  units: units.map(([apiName, star, items]) => ({ apiName, star, items })),
  traits: traits.map(([apiName, minUnits]) => ({ apiName, minUnits })),
});

// Ahri with JG wins; Ahri without JG loses; Sett always present; Zyra only on Ahri+JG boards.
const boards: ExplorerBoard[] = [
  ...Array.from({ length: 10 }, () =>
    board(
      1,
      [
        ["Ahri", 2, ["JG", "BB"]],
        ["Sett", 1, []],
        ["Zyra", 1, []],
      ],
      [["Blossom", 5]],
      9,
    ),
  ),
  ...Array.from({ length: 10 }, () =>
    board(
      8,
      [
        ["Ahri", 1, ["BB"]],
        ["Sett", 1, []],
      ],
      [["Blossom", 3]],
    ),
  ),
  ...Array.from({ length: 5 }, () => board(4, [["Sett", 3, ["JG"]]], [])),
];
const data = decodeExplorer(encodeExplorer(boards).slice().buffer);

describe("explorer engine", () => {
  it("summarizes boards matching unit, star, item, trait and level filters", () => {
    expect(runQuery(data, [{ type: "unit", unit: "Ahri" }], 1).summary?.games).toBe(20);
    expect(runQuery(data, [{ type: "unit", unit: "Ahri", minStar: 2 }], 1).summary?.games).toBe(10);
    expect(runQuery(data, [{ type: "unit", unit: "Ahri", items: ["JG"] }], 1).summary?.games).toBe(10);
    expect(runQuery(data, [{ type: "unit", unit: "Ahri", items: ["BB", "BB"] }], 1).summary).toBeNull();
    expect(runQuery(data, [{ type: "trait", trait: "Blossom", minUnits: 5 }], 1).summary?.games).toBe(10);
    expect(runQuery(data, [{ type: "level", min: 9 }], 1).summary?.games).toBe(10);
    expect(runQuery(data, [], 1).summary?.games).toBe(25);
  });

  it("ranks units, traits and the filtered unit's items against the filtered average", () => {
    const result = runQuery(data, [{ type: "unit", unit: "Ahri" }], 1);
    expect(result.units.map((row) => row.key)).toEqual(["Zyra", "Sett"]);
    expect(result.units[0]!.line.delta).toBeLessThan(0);
    expect(result.traits[0]!.key).toBe("Blossom:5");
    expect(result.items["Ahri"]!.map((row) => [row.key, row.line.games])).toEqual([
      ["JG", 10],
      ["BB", 20],
    ]);
  });

  it("hides rows below the minimum games and handles unknown names", () => {
    expect(runQuery(data, [{ type: "unit", unit: "Ahri" }], 15).units.map((row) => row.key)).toEqual(["Sett"]);
    expect(runQuery(data, [{ type: "unit", unit: "Nobody" }]).summary).toBeNull();
  });
});

describe("similar boards", () => {
  it("uses the largest overlap with enough games", () => {
    // Ahri + Sett + Zyra appear together on 10 boards, all first place.
    expect(similarBoards(data, ["Ahri", "Sett", "Zyra"], 10)).toMatchObject({
      shared: 3,
      total: 3,
      line: { games: 10, avg: 1 },
    });
    // Asking for 15 games can't be met by 3 shared units, and fewer than 3 never counts.
    expect(similarBoards(data, ["Ahri", "Sett", "Zyra"], 15)).toBeNull();
  });

  it("counts boards missing one of four units once the full match is too rare", () => {
    // Nobody fields Kayle, so the 10 Ahri + Sett + Zyra boards share 3 of the 4.
    expect(similarBoards(data, ["Ahri", "Sett", "Zyra", "Kayle"], 10)).toMatchObject({ shared: 3, total: 3 });
  });

  it("gives shares of the whole patch from a champion's file", () => {
    const ahriBoards = boards.filter((entry) => entry.units.some((unit) => unit.apiName === "Ahri"));
    const ahri = decodeExplorer(encodeExplorer(ahriBoards, 0, [200]).slice().buffer);
    expect(similarBoards(ahri, ["Ahri", "Sett", "Zyra"], 10)?.line).toMatchObject({ games: 10, play: 0.05 });
  });
});

describe("explorer rank floors", () => {
  // Master+ (rank 0) boards win, Diamond (1) boards place 4th, Emerald (2) boards place 8th.
  const ranked = [
    ...Array.from({ length: 4 }, () => ({ ...board(1, [["Ahri", 1, []]], []), rank: 0 })),
    ...Array.from({ length: 4 }, () => ({ ...board(4, [["Ahri", 1, []]], []), rank: 1 })),
    ...Array.from({ length: 4 }, () => ({ ...board(8, [["Ahri", 1, []]], []), rank: 2 })),
  ];
  const sample = decodeExplorer(encodeExplorer(ranked, 1).slice().buffer);

  it("uses the default floor unless asked for another", () => {
    expect(runQuery(sample, [], 1).summary?.games).toBe(8);
    expect(runQuery(sample, [], 1, 0).summary).toMatchObject({ games: 4, avg: 1 });
    expect(runQuery(sample, [], 1, 2).summary?.games).toBe(12);
  });

  it("gives shares of the boards at the floor, not the whole sample", () => {
    expect(runQuery(sample, [], 1).summary?.play).toBe(1);
    expect(runQuery(sample, [], 1, 0).summary?.play).toBe(1);
  });

  it("gives shares of the whole patch for a file holding every board of a champion", () => {
    // These 20 Ahri boards are all of the patch's Ahri boards, out of 200 boards in all.
    const ahriBoards = boards.filter((entry) => entry.units.some((unit) => unit.apiName === "Ahri"));
    const shard = decodeExplorer(encodeExplorer(ahriBoards, 0, [200]).slice().buffer);
    const result = runQuery(shard, [{ type: "unit", unit: "Ahri" }], 1);
    expect(result.summary?.games).toBe(20);
    expect(result.summary?.play).toBe(0.1);
  });

  it("answers from the totals exactly as from the boards, without a champion or trait", () => {
    const ranked = boards.map((entry, i) => ({ ...entry, rank: i % 2 }));
    const accumulator = new TotalsAccumulator();
    for (const entry of ranked) accumulator.add(entry);
    const totals = accumulator.results(1);
    const all = decodeExplorer(encodeExplorer(ranked, 1).slice().buffer);
    for (const filters of [[], [{ type: "level" as const, min: 9 }]]) {
      for (const floor of [0, 1]) {
        expect(runTotalsQuery(totals, filters, 1, floor)).toEqual(runQuery(all, filters, 1, floor));
      }
    }
    expect(() => runTotalsQuery(totals, [{ type: "unit", unit: "Ahri" }])).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import type { ResolvedBoard } from "./boards.ts";
import { ExplorerCollector, type ExplorerPart } from "./explorer.ts";

const board = (placement: number, units: string[], traits: string[] = []): ResolvedBoard => ({
  placement,
  level: 8,
  units: units.map((apiName, i) => ({ apiName, star: 2, items: i === 0 ? ["JG", "BB"] : [] })),
  traits: traits.map((apiName) => ({ apiName, minUnits: 3, style: 1, count: 3 })),
});
const placements = (parts: ExplorerPart[], kind: ExplorerPart["kind"], apiName: string) =>
  parts
    .filter((part) => part.kind === kind && part.apiName === apiName)
    .map((part) => part.boards.map((entry) => entry.placement));

describe("ExplorerCollector", () => {
  const collector = new ExplorerCollector();
  collector.add("master_plus", board(1, ["Ahri", "Sett"], ["Blossom"]));
  collector.add("master_plus", board(2, ["Ahri"]));
  collector.add("diamond", board(3, ["Sett", "Sett"], ["Blossom", "Blossom"]));
  collector.add("diamond", board(4, ["Ahri"]));
  const parts = [...collector.parts(2)];

  it("files every board once under each of its champions and traits, split by rank", () => {
    expect(collector.population).toEqual([2, 2, 0, 0, 0]);
    expect(placements(parts, "champion", "Ahri")).toEqual([[1, 2], [4]]);
    expect(placements(parts, "champion", "Sett")).toEqual([[1], [3]]);
    expect(placements(parts, "trait", "Blossom")).toEqual([[1], [3]]);
    expect(collector.totals.results(1).groups.map((group) => group.summary[0])).toEqual([2, 2]);
  });

  it("gives every champion and trait a part for each rank, even without boards there", () => {
    const collector = new ExplorerCollector();
    collector.add("master_plus", board(1, ["Ahri"]));
    expect([...collector.parts(3)].map((part) => [part.rank, part.boards.length])).toEqual([
      [0, 1],
      [1, 0],
      [2, 0],
    ]);
  });

  it("unpacks boards exactly as they were added", () => {
    const sett = parts.find((part) => part.kind === "champion" && part.apiName === "Sett" && part.rank === 1)!;
    expect(sett.boards).toEqual([
      {
        placement: 3,
        level: 8,
        rank: 1,
        units: [
          { apiName: "Sett", star: 2, items: ["JG", "BB"] },
          { apiName: "Sett", star: 2, items: [] },
        ],
        traits: [
          { apiName: "Blossom", minUnits: 3 },
          { apiName: "Blossom", minUnits: 3 },
        ],
      },
    ]);
  });
});

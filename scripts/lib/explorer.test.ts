import { describe, expect, it } from "vitest";
import type { ResolvedBoard } from "./boards.ts";
import { ExplorerCollector } from "./explorer.ts";

const board = (placement: number, units: string[], traits: string[] = []): ResolvedBoard => ({
  placement,
  level: 8,
  units: units.map((apiName) => ({ apiName, star: 2, items: [] })),
  traits: traits.map((apiName) => ({ apiName, minUnits: 3, style: 1, count: 3 })),
});
const placements = (boards: { placement: number }[] | undefined) => boards?.map((entry) => entry.placement);

describe("ExplorerCollector", () => {
  it("files every board under each of its champions and traits once, and samples the newest of each rank", () => {
    const collector = new ExplorerCollector(
      new Map([
        ["master_plus", 1],
        ["diamond", 2],
      ]),
    );
    collector.add("master_plus", board(1, ["Ahri", "Sett"], ["Blossom"]));
    collector.add("master_plus", board(2, ["Ahri"]));
    collector.add("diamond", board(3, ["Sett", "Sett"], ["Blossom", "Blossom"]));
    collector.add("diamond", board(4, ["Ahri"]));

    expect(collector.population).toEqual([2, 2, 0, 0, 0]);
    expect(placements(collector.sample)).toEqual([1, 3, 4]);
    expect(placements(collector.champions.get("Ahri"))).toEqual([1, 2, 4]);
    expect(placements(collector.champions.get("Sett"))).toEqual([1, 3]);
    expect(placements(collector.traits.get("Blossom"))).toEqual([1, 3]);
    expect(collector.sample[0]).toMatchObject({ rank: 0, traits: [{ apiName: "Blossom", minUnits: 3 }] });
    expect(collector.totals.results(1).groups.map((group) => group.summary[0])).toEqual([2, 2]);
  });
});

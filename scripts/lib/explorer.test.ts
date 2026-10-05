import { describe, expect, it } from "vitest";
import type { ResolvedBoard } from "./boards.ts";
import { ExplorerCollector } from "./explorer.ts";

const board = (placement: number, ...units: string[]): ResolvedBoard => ({
  placement,
  level: 8,
  units: units.map((apiName) => ({ apiName, star: 2, items: [] })),
  traits: [{ apiName: "Blossom", minUnits: 3, style: 1, count: 3 }],
});

describe("ExplorerCollector", () => {
  it("files every board under each of its champions once, and samples the newest of each rank up to its quota", () => {
    const collector = new ExplorerCollector(
      new Map([
        ["master_plus", 1],
        ["diamond", 2],
      ]),
    );
    collector.add("master_plus", board(1, "Ahri", "Sett"));
    collector.add("master_plus", board(2, "Ahri"));
    collector.add("diamond", board(3, "Sett", "Sett"));
    collector.add("diamond", board(4, "Ahri"));

    expect(collector.population).toEqual([2, 2, 0, 0, 0]);
    expect(collector.sample.map((entry) => entry.placement)).toEqual([1, 3, 4]);
    expect(collector.shards.get("Ahri")?.map((entry) => entry.placement)).toEqual([1, 2, 4]);
    expect(collector.shards.get("Sett")?.map((entry) => entry.placement)).toEqual([1, 3]);
    expect(collector.sample[0]).toMatchObject({ rank: 0, traits: [{ apiName: "Blossom", minUnits: 3 }] });
  });
});

import { describe, expect, it } from "vitest";
import type { SetData, StatLine } from "../../src/lib/data/schema.ts";
import { emptyCounters } from "../lib/aggregate.ts";
import type { Counters, PatchCounters, RankBucket } from "../store/types.ts";
import { adjustedAverage, statLine } from "../../src/lib/game/stat-line.ts";
import {
  assignTiers,
  buildFloorStats,
  buildNewestPatchStats,
  buildSetStats,
  chooseSample,
  distinctFloors,
  MIN_GAMES,
} from "./stats.ts";

const withMatches = (matches: number, extra: Partial<Counters> = {}): Counters => ({
  ...emptyCounters(),
  matches,
  boards: matches * 8,
  ...extra,
});

const patch = (name: string, buckets: Partial<Record<RankBucket, Counters>>): PatchCounters => ({
  set: 18,
  patch: name,
  updatedAt: "2026-09-30T00:00:00Z",
  buckets,
});

describe("chooseSample", () => {
  it("uses Diamond+ on the newest patch when there are enough matches", () => {
    const sample = chooseSample([patch("16.19", { master_plus: withMatches(1500), diamond: withMatches(1000) })], 2000);
    expect(sample).toMatchObject({ floor: "diamond", previousPatch: false });
    expect(sample?.counters.matches).toBe(2500);
  });

  it("falls back to the previous patch of the same set right after a patch", () => {
    const sample = chooseSample(
      [patch("16.20", { diamond: withMatches(300) }), patch("16.19", { diamond: withMatches(5000) })],
      2000,
    );
    expect(sample).toMatchObject({ floor: "diamond", previousPatch: true });
    expect(sample?.patch.patch).toBe("16.19");
  });

  it("drops to lower rank floors early in a set, when the top of the ladder is still empty", () => {
    const sample = chooseSample(
      [patch("16.1", { diamond: withMatches(100), emerald: withMatches(600), gold: withMatches(1500) })],
      2000,
    );
    expect(sample?.floor).toBe("gold");
    expect(chooseSample([patch("16.1", { gold: withMatches(100) })], 2000)).toBeNull();
  });
});

describe("tiers", () => {
  it("pulls small samples toward 4.5", () => {
    expect(adjustedAverage([1, 1, 1, 1])).toBeCloseTo((1 + 30 * 4.5) / 31);
    expect(adjustedAverage([10_000, 30_000, 0, 0])).toBeCloseTo(3.0, 2);
  });

  it("shows the raw average and ranks by the adjusted score", () => {
    const line = statLine([2, 2, 2, 2], 100);
    expect(line.avg).toBe(1);
    expect(line.score).toBeCloseTo((2 + 30 * 4.5) / 32, 2);
  });

  it("assigns S–C by share and skips entries below the minimum", () => {
    const lines: StatLine[] = Array.from({ length: 10 }, (_, i) => ({
      games: 500,
      avg: 3 + i * 0.2,
      score: 3 + i * 0.2,
      top4: 0,
      win: 0,
      play: 0,
    }));
    lines.push({ games: 10, avg: 1, score: 4.2, top4: 0, win: 0, play: 0 });
    assignTiers(lines, 100);
    expect(lines.map((line) => line.tier)).toEqual(["S", "A", "A", "B", "B", "B", "B", "C", "C", "C", undefined]);
  });
});

describe("buildSetStats", () => {
  const data = {
    number: 18,
    champions: [{ apiName: "TFT18_Ahri" }, { apiName: "TFT18_Lux" }, { apiName: "TFT18_Lux_Coven" }],
    traits: [{ apiName: "TFT18_Blossom", breakpoints: [{ minUnits: 3 }, { minUnits: 5 }] }],
    items: [
      { apiName: "TFT_Item_BlueBuff", kind: "completed" },
      { apiName: "TFT_Item_BFSword", kind: "component" },
    ],
    itemAliases: { DA_BlueBuff: "TFT_Item_BlueBuff" },
    championAliases: { TFT18_Lux_Clone: "TFT18_Lux" },
  } as unknown as SetData;

  const counters = withMatches(3000, {
    units: {
      TFT18_Ahri: [MIN_GAMES.unit, 700, 150, 60],
      TFT18_Mystery: [40, 180, 20, 5],
      TFT18_Lux: [100, 400, 60, 20],
      TFT18_Lux_Coven: [50, 150, 40, 15],
      TFT18_Lux_Clone: [3, 12, 1, 0],
    },
    items: {
      TFT_Item_BlueBuff: [150, 450, 110, 40],
      DA_BlueBuff: [100, 300, 70, 20],
      TFT_Item_BFSword: [300, 1500, 100, 20],
    },
    unitItems: { "TFT18_Ahri|DA_BlueBuff": [80, 240, 60, 20], "TFT18_Ahri|TFT_Item_BFSword": [90, 450, 30, 5] },
    traits: { "TFT18_Blossom|2": [400, 1600, 220, 60] },
  });

  const { stats, unknown } = buildSetStats(data, [patch("16.19", { diamond: counters })]);

  it("merges item aliases and reports names it can't map", () => {
    expect(stats.items["TFT_Item_BlueBuff"]?.games).toBe(250);
    expect(stats.items["DA_BlueBuff"]).toBeUndefined();
    expect([...unknown.units.keys()]).toEqual(["TFT18_Mystery"]);
  });

  it("keeps forms as their own champions and counts clones as their base", () => {
    expect(stats.units["TFT18_Lux"]?.games).toBe(103);
    expect(stats.units["TFT18_Lux_Coven"]?.games).toBe(50);
    expect(unknown.units.has("TFT18_Lux_Clone")).toBe(false);
  });

  it("does not tier components and maps trait tiers to breakpoints", () => {
    expect(stats.items["TFT_Item_BFSword"]?.tier).toBeUndefined();
    expect(stats.traits).toMatchObject([{ trait: "TFT18_Blossom", minUnits: 5, games: 400 }]);
  });

  it("lists best items per unit, excluding components", () => {
    expect(stats.bestItems["TFT18_Ahri"]?.map((line) => line.item)).toEqual(["TFT_Item_BlueBuff"]);
  });

  it("reports collecting status until there are enough matches", () => {
    const result = buildSetStats(data, [patch("16.1", { gold: withMatches(50) })]);
    expect(result.stats).toMatchObject({ status: "collecting", matches: 50, patch: "16.1" });
  });
});

describe("distinctFloors", () => {
  const floor = (name: string, matches: number) => ({ name, matches });
  const names = (floors: { name: string }[]) => floors.map((entry) => entry.name);

  it("drops floors within 10% of their neighbour, on both sides of the default", () => {
    // master, diamond (default), emerald, platinum
    const floors = [floor("master", 15008), floor("diamond", 15232), floor("emerald", 15483), floor("platinum", 18000)];
    expect(names(distinctFloors(floors, 1))).toEqual(["platinum"]);
  });

  it("keeps floors that add enough games, comparing each to the last one kept", () => {
    const floors = [floor("master", 6000), floor("diamond", 10000), floor("emerald", 10500), floor("platinum", 11600)];
    expect(names(distinctFloors(floors, 1))).toEqual(["master", "platinum"]);
  });

  it("skips floors without stats", () => {
    expect(names(distinctFloors([undefined, floor("diamond", 100), floor("emerald", 200)], 1))).toEqual(["emerald"]);
  });
});

describe("buildFloorStats", () => {
  const data = {
    number: 18,
    champions: [],
    traits: [],
    items: [],
    itemAliases: {},
    championAliases: {},
  } as unknown as SetData;
  const patches = [
    patch("18.3", { master_plus: withMatches(2500), diamond: withMatches(1000), gold: withMatches(500) }),
  ];

  it("builds the chosen floor on the default sample's patch", () => {
    expect(buildFloorStats(data, patches, "master")).toMatchObject({
      rankFloor: "master",
      matches: 2500,
      status: "ready",
    });
    expect(buildFloorStats(data, patches, "gold")?.matches).toBe(4000);
  });

  it("is null for a floor without enough games", () => {
    const thin = [patch("18.3", { master_plus: withMatches(500), diamond: withMatches(1600) })];
    expect(buildFloorStats(data, thin, "master")).toBeNull();
  });
});

describe("buildNewestPatchStats", () => {
  const data = {
    number: 18,
    champions: [],
    traits: [],
    items: [],
    itemAliases: {},
    championAliases: {},
  } as unknown as SetData;

  it("builds the newest patch at the default floor while the stats fall back to the previous one", () => {
    const patches = [
      patch("18.3", { master_plus: withMatches(1500), diamond: withMatches(1500) }),
      patch("18.4", { master_plus: withMatches(100), diamond: withMatches(200), gold: withMatches(900) }),
    ];
    const { stats } = buildSetStats(data, patches);
    expect(stats).toMatchObject({ patch: "18.3", rankFloor: "diamond", previousPatch: true });
    expect(buildNewestPatchStats(data, patches, stats)).toMatchObject({
      patch: "18.4",
      rankFloor: "diamond",
      matches: 300,
      previousPatch: false,
      status: "ready",
    });
  });

  it("is null when the stats are already on the newest patch, or it has no games at their floor", () => {
    const current = [patch("18.4", { diamond: withMatches(3000) })];
    expect(buildNewestPatchStats(data, current, buildSetStats(data, current).stats)).toBeNull();

    const empty = [patch("18.3", { diamond: withMatches(3000) }), patch("18.4", { gold: withMatches(50) })];
    expect(buildNewestPatchStats(data, empty, buildSetStats(data, empty).stats)).toBeNull();
  });
});

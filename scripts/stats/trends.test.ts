import { describe, expect, it } from "vitest";
import type { AutoComp, SetData, SetStats, StatLine } from "../../src/lib/data/schema.ts";
import { emptyCounters } from "../lib/aggregate.ts";
import type { PatchCounters } from "../store/types.ts";
import { MIN_EARLY_MATCHES, MIN_GAMES } from "./stats.ts";
import { compTrends, droppedComps, otherPatchStats, patchHistory, patchTrend } from "./trends.ts";

const line = (avg: number, games: number = MIN_GAMES.unit): StatLine => ({
  games,
  avg,
  score: avg,
  top4: 0.5,
  win: 0.1,
  play: 0.1,
});

const stats = (patch: string, units: Record<string, StatLine>, status: SetStats["status"] = "ready"): SetStats => ({
  set: 18,
  patch,
  updatedAt: "",
  status,
  rankFloor: "diamond",
  matches: 3000,
  previousPatch: false,
  units,
  items: {},
  traits: [{ trait: "Blossom", minUnits: 5, ...line(4, MIN_GAMES.trait) }],
  bestItems: {},
});

describe("patch trends", () => {
  const p183 = stats("18.3", { Ahri: line(4.6), Sett: line(4.2), Rare: line(3, 10) });
  const p183b = stats("18.3b", { Ahri: line(4.35), Sett: line(4.4), Rare: line(4, 10) });

  it("compares with the newest earlier patch, skipping entries with too few games", () => {
    const older = stats("18.2", { Ahri: line(5) });
    expect(patchTrend(p183b, [older, p183])).toMatchObject({
      patch: "18.3",
      units: { Ahri: -0.25, Sett: 0.2 },
      items: {},
      traits: { "Blossom:5": 0 },
    });
  });

  it("keeps every entry's earlier average, play rate and games, however few games it had", () => {
    expect(patchTrend(p183b, [p183])?.before?.units).toEqual({
      Ahri: [4.6, 0.1, MIN_GAMES.unit],
      Sett: [4.2, 0.1, MIN_GAMES.unit],
      Rare: [3, 0.1, 10],
    });
  });

  it("has no trend without an earlier ready patch", () => {
    expect(patchTrend(p183b, [stats("18.4", {}), stats("18.2", {}, "collecting")])).toBeNull();
  });

  it("builds per-patch history in patch order, with gaps for thin patches", () => {
    const history = patchHistory([p183b, p183]);
    expect(history.patches).toEqual(["18.3", "18.3b"]);
    expect(history.units["Ahri"]).toEqual([4.6, 4.35]);
    expect(history.units["Rare"]).toEqual([null, null]);
    // Play rates are kept however few games, since they say how rarely it was played.
    expect(history.play?.units["Rare"]).toEqual([0.1, 0.1]);
  });

  it("doesn't compare items counted per board with items counted per copy", () => {
    const items = (avg: number) => ({ Gauntlet: line(avg, MIN_GAMES.item) });
    const perCopy = { ...stats("18.3", {}), items: items(4.2) };
    const perBoard = { ...stats("18.3b", {}), items: items(4), itemsPerBoard: true };
    expect(patchTrend(perBoard, [perCopy])?.items).toEqual({});
    expect(patchHistory([perCopy, perBoard]).items["Gauntlet"]).toEqual([null, 4]);
    expect(patchTrend({ ...perBoard, patch: "18.4" }, [perBoard])?.items).toEqual({ Gauntlet: 0 });
  });
});

describe("comp trends", () => {
  const comp = (signature: string, avg: number, games = 100, variants: string[] = []) =>
    ({ id: signature, signature, variants, avg, games }) as AutoComp;

  it("compares each comp with the same comp on the previous patch", () => {
    const result = compTrends([comp("a", 3.5), comp("new", 4)], [comp("a", 3.9), comp("gone", 4.2)]);
    expect(result.map((entry) => [entry.id, entry.trend])).toEqual([
      ["a", -0.4],
      ["new", undefined],
    ]);
  });

  it("compares a merged comp with every previous comp it now covers, weighted by games", () => {
    const [merged] = compTrends([comp("a", 4, 400, ["b"])], [comp("a", 3, 300), comp("b", 7, 100)]);
    expect(merged!.trend).toBe(0);
  });

  it("lists previous comps no current comp covers", () => {
    const dropped = droppedComps([comp("a", 4, 400, ["b"])], [comp("a", 3), comp("b", 7), comp("gone", 4.2)]);
    expect(dropped.map((entry) => entry.id)).toEqual(["gone"]);
  });
});

describe("otherPatchStats", () => {
  const data = {
    number: 18,
    champions: [],
    traits: [],
    items: [],
    itemAliases: {},
    championAliases: {},
  } as unknown as SetData;
  const counters = (patch: string, matches: number): PatchCounters => ({
    set: 18,
    patch,
    updatedAt: "",
    buckets: { diamond: { ...emptyCounters(), matches, boards: matches * 8 } },
  });
  const summaries = [stats("18.2", {}), stats("18.3", {}), { ...stats("18.1", {}), ranks: ["master" as const] }];
  const current = () => ({ ...stats("18.3", {}), previousPatch: true });

  it("offers the newest patch early once it has enough matches, then earlier patches newest first", () => {
    const base = current();
    const others = otherPatchStats(
      data,
      [counters("18.4", MIN_EARLY_MATCHES), counters("18.3", 3000)],
      base,
      summaries,
    );
    expect(others.map((entry) => entry.patch)).toEqual(["18.4", "18.2", "18.1"]);
    expect(base.newestPatch).toEqual({ patch: "18.4", matches: MIN_EARLY_MATCHES });
    // An earlier patch's floors were built for that patch and are gone.
    expect(others[2]!.ranks).toBeUndefined();
  });

  it("still reports a newest patch too thin to offer", () => {
    const base = current();
    const others = otherPatchStats(
      data,
      [counters("18.4", MIN_EARLY_MATCHES - 1), counters("18.3", 3000)],
      base,
      summaries,
    );
    expect(others.map((entry) => entry.patch)).toEqual(["18.2", "18.1"]);
    expect(base.newestPatch?.matches).toBe(MIN_EARLY_MATCHES - 1);
  });
});

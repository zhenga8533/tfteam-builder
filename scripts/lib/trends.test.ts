import { describe, expect, it } from "vitest";
import type { SetStats, StatLine } from "../../src/lib/data/schema.ts";
import { MIN_GAMES } from "./stats.ts";
import { patchHistory, patchTrend } from "./trends.ts";

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
    expect(patchTrend(p183b, [older, p183])).toEqual({
      patch: "18.3",
      units: { Ahri: -0.25, Sett: 0.2 },
      items: {},
      traits: { "Blossom:5": 0 },
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
  });
});

import { describe, expect, it } from "vitest";
import type { ResolvedBoard } from "./boards.ts";
import { companionCatalog, LittleLegendAccumulator, type RawCompanion } from "./little-legends.ts";

const raw = (contentId: string, name: string, tier: number, companionType = "kLittleLegend"): RawCompanion => ({
  contentId,
  name,
  speciesName: name.split(" ").at(-1)!,
  loadoutsIcon: `/lol-game-data/assets/ASSETS/Loadouts/Companions/Tooltip_${name.replace(/ /g, "")}_Tier${tier}.png`,
  companionType,
});

const catalog = companionCatalog([
  raw("ossia-1", "Beatmaker Ossia", 1),
  raw("ossia-3", "Beatmaker Ossia", 3),
  raw("aatrox", "Chibi Aatrox", 1, "kChibi"),
]);

const board = (placement: number, companion?: string) => ({ placement, companion }) as ResolvedBoard;

describe("Little Legends", () => {
  it("turns client asset paths into lowercased CDragon URLs", () => {
    expect(catalog.get("ossia-1")).toEqual({
      name: "Beatmaker Ossia",
      species: "Ossia",
      icon: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loadouts/companions/tooltip_beatmakerossia_tier1.png",
      kind: "legend",
    });
    expect(catalog.get("aatrox")?.kind).toBe("chibi");
  });

  it("counts a legend's star levels together, with the most played level's icon", () => {
    const legends = new LittleLegendAccumulator();
    for (const entry of [
      board(1, "ossia-3"),
      board(4, "ossia-3"),
      board(8, "ossia-1"),
      board(2, "aatrox"),
      board(5),
      board(6, "unknown"),
    ]) {
      legends.add(entry);
    }
    const [ossia, aatrox, ...rest] = legends.results(catalog);
    expect(rest).toEqual([]);
    expect(ossia).toMatchObject({ name: "Beatmaker Ossia", games: 3, avg: 4.33, play: 0.6 });
    expect(ossia!.icon).toMatch(/tier3\.png$/);
    expect(aatrox).toMatchObject({ name: "Chibi Aatrox", games: 1, kind: "chibi" });
  });
});

import { describe, expect, it } from "vitest";
import type { Champion, Trait } from "@/lib/data/schema";
import { BOARD_COLS, type BoardUnit } from "@/lib/game/board";
import type { TraitState, TraitStyle } from "@/lib/game/traits";
import { colorStops, imageFileName } from "@/lib/canvas";
import { boardTitle, hexCenter } from "./board-image";

const champion = (apiName: string, cost: number) => [apiName, { apiName, name: apiName, cost } as Champion] as const;
const championsByApi = new Map([champion("Ahri", 4), champion("Sett", 2), champion("Karma", 4)]);
const unit = (apiName: string, items: number, flex = false): BoardUnit => ({
  apiName,
  star: 2,
  items: Array<string>(items).fill("item"),
  flex,
});
const trait = (name: string, style: TraitStyle, count: number, minUnits = [2, 4]): TraitState => ({
  trait: { apiName: name, name, breakpoints: minUnits.map((min) => ({ minUnits: min })) } as Trait,
  count,
  activeIndex: style === "inactive" ? -1 : 0,
  style,
});

describe("board image", () => {
  it("shifts every second row half a hex right, like the board", () => {
    const first = hexCenter(0);
    const below = hexCenter(BOARD_COLS);
    expect(below.x - first.x).toBeCloseTo((hexCenter(1).x - first.x) / 2);
    expect(hexCenter(BOARD_COLS * 2).x).toBe(first.x);
    expect(below.y).toBeGreaterThan(first.y);
  });

  it("titles the board by its main trait and carries, like detected comps", () => {
    const traits = [trait("Spellweaver", "bronze", 2), trait("Blossom", "gold", 5), trait("Solo", "unique", 1, [1])];
    expect(boardTitle([unit("Ahri", 3), unit("Sett", 0), unit("Karma", 3, true)], traits, championsByApi)).toBe(
      "Blossom Ahri",
    );
    expect(boardTitle([unit("Sett", 0)], [], championsByApi)).toBeNull();
    const tied = [trait("Spellweaver", "bronze", 2), trait("Brawler", "bronze", 2)];
    expect(boardTitle([unit("Sett", 0)], tied, championsByApi)).toBeNull();
    expect(boardTitle([unit("Ahri", 3)], tied, championsByApi)).toBe("Ahri");
  });

  it("reads gradient stops in order", () => {
    expect(colorStops("linear-gradient(170deg, oklch(0.94 0.1 95), oklch(0.62 0.12 75) 50%, rgb(1, 2, 3))")).toEqual([
      "oklch(0.94 0.1 95)",
      "oklch(0.62 0.12 75)",
      "rgb(1, 2, 3)",
    ]);
  });

  it("names the file after the title", () => {
    expect(imageFileName("Set 18 · Level 8")).toBe("set-18-level-8.png");
    expect(imageFileName("···")).toBe("image.png");
  });
});

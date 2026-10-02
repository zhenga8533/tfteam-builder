import { describe, expect, it } from "vitest";
import { BOARD_COLS } from "@/lib/game/board";
import { hexCenter, imageFileName } from "./board-image";

describe("board image", () => {
  it("shifts every second row half a hex right, like the board", () => {
    const first = hexCenter(0);
    const below = hexCenter(BOARD_COLS);
    expect(below.x - first.x).toBeCloseTo((hexCenter(1).x - first.x) / 2);
    expect(hexCenter(BOARD_COLS * 2).x).toBe(first.x);
    expect(below.y).toBeGreaterThan(first.y);
  });

  it("names the file after the title", () => {
    expect(imageFileName("Set 18 · Level 8")).toBe("set-18-level-8.png");
    expect(imageFileName("···")).toBe("team.png");
  });
});

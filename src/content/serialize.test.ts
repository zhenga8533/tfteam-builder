import { describe, expect, it } from "vitest";
import { createBoard } from "@/lib/game/board";
import { boardToCompUnits, compFileName, compSource } from "./serialize";

const board = createBoard();
board[3] = { apiName: "DA_18_Sett", star: 2, items: ["TFT_Item_WarmogsArmor"] };
board[24] = { apiName: "DA_18_Ahri", star: 1, items: [] };

describe("comp serialization", () => {
  it("omits default star levels and empty item lists", () => {
    expect(boardToCompUnits(board)).toEqual([
      { apiName: "DA_18_Sett", hex: 3, star: 2, items: ["TFT_Item_WarmogsArmor"] },
      { apiName: "DA_18_Ahri", hex: 24 },
    ]);
  });

  it("renders a comp module with a set-prefixed slug", () => {
    const source = compSource({ name: "Blossom Ahri!", set: 18, board, today: "2026-10-01" });
    expect(source).toContain('slug: "set18-blossom-ahri"');
    expect(source).toContain('{ apiName: "DA_18_Sett", hex: 3, star: 2, items: ["TFT_Item_WarmogsArmor"] },');
    expect(source).toContain('{ apiName: "DA_18_Ahri", hex: 24 },');
    expect(source).toContain('updatedAt: "2026-10-01"');
    expect(compFileName("Blossom Ahri!")).toBe("blossom-ahri.ts");
  });
});

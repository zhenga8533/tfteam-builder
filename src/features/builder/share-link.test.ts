import { describe, expect, it } from "vitest";
import { createBoard, placeChampion, setStar, toggleFlex, addAlternative, equipItem } from "@/lib/game/board";
import { decodeShareCode, encodeShareCode } from "./share-link";

describe("share links", () => {
  let final = placeChampion(createBoard(), 24, "Ahri");
  final = setStar(equipItem(final, 24, "BlueBuff"), 24, 2);
  final = addAlternative(toggleFlex(placeChampion(final, 3, "Sett"), 3), 3, "Rammus");
  const early = placeChampion(createBoard(), 0, "Sett");
  const known = (apiName: string) => ["Ahri", "Sett", "Rammus"].includes(apiName);

  it("round-trips level boards with stars, items, flex units and alternatives", () => {
    const code = encodeShareCode(18, [
      { level: 6, board: early },
      { level: 8, board: final },
    ]);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShareCode(code, known)).toEqual({
      ok: true,
      set: 18,
      boards: [
        { level: 6, board: early },
        { level: 8, board: final },
      ],
    });
  });

  it("drops champions the current data doesn't have", () => {
    const code = encodeShareCode(18, [{ level: 8, board: final }]);
    const result = decodeShareCode(code, (apiName) => apiName === "Ahri");
    expect(result.ok && result.boards[0]!.board.filter(Boolean).map((unit) => unit!.apiName)).toEqual(["Ahri"]);
  });

  it("rejects broken codes", () => {
    expect(decodeShareCode("not-a-code", known).ok).toBe(false);
    expect(decodeShareCode(btoa(JSON.stringify({ v: 2 })), known).ok).toBe(false);
  });
});

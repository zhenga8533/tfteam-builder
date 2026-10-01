import { describe, expect, it } from "vitest";
import type { SetData } from "../../src/lib/data/schema.ts";
import type { BoardRow } from "../stats/types.ts";
import { FormInference } from "./forms.ts";

const data = {
  champions: [
    { apiName: "Lux", traits: ["Avatar"] },
    { apiName: "Lux_Coven", formOf: "Lux", traits: ["Coven", "Avatar"] },
    { apiName: "Lux_Fae", formOf: "Lux", traits: ["Fae", "Avatar"] },
    { apiName: "Morgana", traits: ["Coven"] },
    { apiName: "Kayle", traits: ["Fae"] },
  ],
  traits: [{ apiName: "Avatar" }, { apiName: "Coven" }, { apiName: "Fae" }],
  items: [{ apiName: "FaeEmblem", trait: "Fae" }],
  itemAliases: {},
  championAliases: {},
} as unknown as SetData;

const row = (units: BoardRow[5], traits: BoardRow[6]): BoardRow => ["m", 0, "diamond", 1, 8, units, traits];
const units = (row: BoardRow) => row[5].map(([unit]) => unit);

describe("FormInference", () => {
  const forms = new FormInference(data);

  it("names the form whose trait the rest of the board doesn't explain", () => {
    // Morgana is the only Coven unit, yet Coven counts 3: Avatar forms count their trait twice.
    const board = row(
      [
        ["Lux", 2, []],
        ["Morgana", 1, []],
        ["Kayle", 1, []],
      ],
      [
        ["Avatar", 1, 1],
        ["Coven", 1, 3],
        ["Fae", 0, 1],
      ],
    );
    expect(units(forms.row(board))).toEqual(["Lux_Coven", "Morgana", "Kayle"]);
  });

  it("accounts for emblems", () => {
    const board = row(
      [
        ["Lux", 2, []],
        ["Morgana", 1, ["FaeEmblem"]],
      ],
      [
        ["Coven", 0, 1],
        ["Fae", 1, 3],
      ],
    );
    expect(units(forms.row(board))).toEqual(["Lux_Fae", "Morgana"]);
  });

  it("leaves the base champion when the counts don't single out a form", () => {
    const board = row(
      [
        ["Lux", 2, []],
        ["Morgana", 1, []],
      ],
      [["Coven", 0, 1]],
    );
    expect(forms.row(board)).toBe(board);
  });
});

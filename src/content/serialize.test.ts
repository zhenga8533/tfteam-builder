import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";
import { createBoard } from "@/lib/game/board";
import set18 from "./tierlists/set18";
import {
  boardToCompUnits,
  compFileName,
  compSource,
  EMPTY_GUIDE,
  formatContentSource,
  tierListSource,
} from "./serialize";

const board = createBoard();
board[3] = { apiName: "DA_18_Sett", star: 2, items: ["TFT_Item_WarmogsArmor"] };
board[24] = { apiName: "DA_18_Ahri", star: 1, items: [] };

const guide = (name: string) => ({ ...EMPTY_GUIDE, name });

describe("comp serialization", () => {
  it("omits default star levels and empty item lists, and marks carries", () => {
    expect(boardToCompUnits(board)).toEqual([
      { apiName: "DA_18_Sett", hex: 3, star: 2, items: ["TFT_Item_WarmogsArmor"] },
      { apiName: "DA_18_Ahri", hex: 24 },
    ]);
    expect(boardToCompUnits(board, ["DA_18_Ahri"])[1]).toEqual({ apiName: "DA_18_Ahri", hex: 24, carry: true });
  });

  it("renders a comp module with a set-prefixed slug", () => {
    const source = compSource({ guide: guide("Blossom Ahri!"), set: 18, board, today: "2026-10-01" });
    expect(source).toContain('slug: "set18-blossom-ahri"');
    expect(source).toContain('{ apiName: "DA_18_Sett", hex: 3, star: 2, items: ["TFT_Item_WarmogsArmor"] },');
    expect(source).toContain('{ apiName: "DA_18_Ahri", hex: 24 },');
    expect(source).toContain('updatedAt: "2026-10-01"');
    expect(compFileName("Blossom Ahri!")).toBe("blossom-ahri.ts");
  });

  it("writes the guide's details, skipping blank tips", () => {
    const source = compSource({
      guide: {
        ...guide("Test"),
        tier: "S",
        playstyle: "Reroll",
        difficulty: "Hard",
        summary: ' Says "hi". ',
        augments: ["TFT_Augment_A", "TFT_Augment_B"],
        tips: ["First tip", "  ", "Second tip"],
        carries: ["DA_18_Ahri"],
      },
      set: 18,
      board,
    });
    expect(source).toContain('tier: "S",\n  playstyle: "Reroll",\n  difficulty: "Hard",');
    expect(source).toContain('summary: "Says \\"hi\\".",');
    expect(source).toContain('augments: ["TFT_Augment_A", "TFT_Augment_B"],');
    expect(source).toContain('tips: ["First tip", "Second tip"],');
    expect(source).toContain('{ apiName: "DA_18_Ahri", hex: 24, carry: true },');
  });

  it("writes flex units, alternatives and an early board", () => {
    const final = createBoard();
    final[5] = { apiName: "DA_18_Sett", star: 1, items: [], flex: true, alternatives: ["DA_18_Rammus"] };
    const source = compSource({ guide: guide("Test"), set: 18, board: final, early: board, today: "2026-10-01" });
    expect(source).toContain('{ apiName: "DA_18_Sett", hex: 5, flex: true, alternatives: ["DA_18_Rammus"] },');
    expect(source).toContain('early: [\n    { apiName: "DA_18_Sett", hex: 3,');
    expect(compSource({ guide: guide("Test"), set: 18, board })).not.toContain("early");
  });

  it("formats modules exactly as the repository's Prettier config does", async () => {
    const source = compSource({
      guide: {
        ...guide("Long"),
        summary: "A summary long enough that Prettier has to wrap it onto its own line after the key. ".repeat(2),
        tips: ["A tip that is long enough to push the list past the line width on its own, surely.", "Another."],
        carries: ["DA_18_Sett"],
      },
      set: 18,
      board,
    });
    const formatted = await formatContentSource(source);
    const file = join(import.meta.dirname, "comps", "set18", "long.ts");
    const config = await prettier.resolveConfig(file);
    expect(await prettier.check(formatted, { ...config, filepath: file })).toBe(true);
    expect(formatted).toContain("summary:\n    ");
  });
});

describe("tier list serialization", () => {
  it("reproduces a tier list file exactly", async () => {
    const file = readFileSync(join(import.meta.dirname, "tierlists", "set18.ts"), "utf8");
    expect(await formatContentSource(tierListSource(set18))).toBe(file.replace(/\r\n/g, "\n"));
  });

  it("orders tiers and drops empty rows and sections", () => {
    const source = tierListSource({
      set: 19,
      items: { B: ["b"], S: ["s"], A: [] },
      fallback: { champions: {} },
      augments: {},
      updatedAt: "2026-10-03",
    });
    expect(source).toContain('items: {\n    S: ["s"],\n    B: ["b"],\n  },');
    expect(source).not.toContain("fallback");
    expect(source).toContain("augments: {},");
  });
});

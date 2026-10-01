import { describe, expect, it } from "vitest";
import type { Champion, Item, Trait } from "@/lib/data/schema";
import { computeTraits } from "@/lib/game/traits";
import {
  addAlternative,
  addChampion,
  createBoard,
  equipBlocker,
  moveUnit,
  placeChampion,
  removeAlternative,
  setStar,
  swapAlternative,
  teamCost,
  toggleFlex,
} from "@/lib/game/board";
import { DEFAULT_LEVEL, migrateV1 } from "./store";
import { decodeTeamCode, encodeTeamCode } from "./team-code";

const champion = (apiName: string, cost: number, traits: string[], plannerCode?: number): Champion => ({
  apiName,
  name: apiName,
  cost,
  traits,
  icon: "",
  splash: "",
  plannerCode,
  ability: { name: "", desc: "", icon: "", variables: {} },
  stats: {
    hp: 0,
    mana: 0,
    initialMana: 0,
    damage: 0,
    attackSpeed: 0,
    armor: 0,
    magicResist: 0,
    critChance: 0,
    critMultiplier: 0,
    range: 0,
  },
});

const trait = (apiName: string, minUnits: number[], styles: number[]): Trait => ({
  apiName,
  name: apiName,
  desc: "",
  icon: "",
  breakpoints: minUnits.map((min, i) => ({ minUnits: min, maxUnits: 99, style: styles[i]!, variables: {} })),
  source: "champion",
});

const emblem: Item = {
  apiName: "FaeEmblem",
  name: "Fae Emblem",
  desc: "",
  icon: "",
  kind: "emblem",
  composition: [],
  effects: {},
  unique: false,
  trait: "Fae",
};

const champions = [champion("Ahri", 4, ["Fae", "Mage"], 0x3e9), champion("Ashe", 5, ["Mage"], 0x3f0)];
const championsByApi = new Map(champions.map((c) => [c.apiName, c]));
const traitsByApi = new Map([
  ["Fae", trait("Fae", [2, 4], [1, 5])],
  ["Mage", trait("Mage", [2], [3])],
]);
const itemsByApi = new Map([[emblem.apiName, emblem]]);

describe("board", () => {
  it("fills the first free hex and swaps on move", () => {
    const board = addChampion(addChampion(createBoard(), "Ahri")!, "Ashe")!;
    expect(board.slice(0, 2).map((unit) => unit?.apiName)).toEqual(["Ahri", "Ashe"]);
    expect(
      moveUnit(board, 0, 1)
        .slice(0, 2)
        .map((unit) => unit?.apiName),
    ).toEqual(["Ashe", "Ahri"]);
  });

  it("prices star levels as copies of the unit", () => {
    const board = setStar(placeChampion(placeChampion(createBoard(), 0, "Ahri"), 1, "Ashe"), 0, 2);
    expect(
      teamCost(
        board.filter((unit) => unit !== null),
        championsByApi,
      ),
    ).toBe(4 * 3 + 5);
  });

  it("blocks emblems on units that already have the trait", () => {
    const unit = { apiName: "Ahri", star: 1 as const, items: [] };
    expect(equipBlocker(unit, championsByApi.get("Ahri")!, emblem)).toMatch(/already has that trait/);
    expect(equipBlocker({ ...unit, apiName: "Ashe" }, championsByApi.get("Ashe")!, emblem)).toBeNull();
  });
});

describe("computeTraits", () => {
  it("counts duplicate champions once and adds emblem traits", () => {
    const traits = computeTraits(
      [
        { apiName: "Ahri", items: [] },
        { apiName: "Ahri", items: [] },
        { apiName: "Ashe", items: ["FaeEmblem"] },
      ],
      championsByApi,
      traitsByApi,
      itemsByApi,
    );
    expect(traits.map(({ trait, count, style }) => [trait.apiName, count, style])).toEqual([
      ["Mage", 2, "silver"],
      ["Fae", 2, "bronze"],
    ]);
  });

  it("counts a trait in traitCounts more than once", () => {
    const avatar = { ...champion("AhriFae", 4, ["Fae"]), traitCounts: { Fae: 2 } };
    const traits = computeTraits(
      [{ apiName: "AhriFae", items: [] }],
      new Map([["AhriFae", avatar]]),
      traitsByApi,
      itemsByApi,
    );
    expect(traits.map(({ trait, count }) => [trait.apiName, count])).toEqual([["Fae", 2]]);
  });
});

describe("team codes", () => {
  it("round-trips three-digit planner codes", () => {
    const code = encodeTeamCode(["Ahri", "Ashe", "Ahri"], champions, 18);
    expect(code).toBe(`02${"3e9"}${"3f0"}${"000".repeat(8)}TFTSet18`);
    expect(decodeTeamCode(code, champions)).toEqual({ ok: true, set: 18, apiNames: ["Ahri", "Ashe"] });
  });

  it("plans a form as its shop champion", () => {
    const withForm = [...champions, { ...champion("Ahri_Fae", 4, []), formOf: "Ahri" }];
    expect(encodeTeamCode(["Ahri_Fae", "Ahri"], withForm, 18)).toBe(`02${"3e9"}${"000".repeat(9)}TFTSet18`);
  });

  it("decodes the classic two-digit format", () => {
    const legacy = [champion("A", 1, [], 1), champion("B", 1, [], 10)];
    expect(decodeTeamCode(`01010a${"00".repeat(8)}TFTSet13`, legacy)).toEqual({
      ok: true,
      set: 13,
      apiNames: ["A", "B"],
    });
  });

  it("rejects garbage and unknown champions", () => {
    expect(decodeTeamCode("hello", champions).ok).toBe(false);
    expect(decodeTeamCode(`02fff${"000".repeat(9)}TFTSet18`, champions).ok).toBe(false);
  });
});

describe("flex and alternatives", () => {
  const board = placeChampion(createBoard(), 0, "Ahri");

  it("toggles flex and keeps it when the unit moves", () => {
    const flexed = toggleFlex(board, 0);
    expect(flexed[0]?.flex).toBe(true);
    expect(moveUnit(flexed, 0, 5)[5]?.flex).toBe(true);
    expect(toggleFlex(flexed, 0)[0]?.flex).toBe(false);
  });

  it("adds, swaps and removes alternatives without duplicates", () => {
    let next = addAlternative(board, 0, "Ashe");
    next = addAlternative(next, 0, "Ashe");
    next = addAlternative(next, 0, "Ahri");
    expect(next[0]?.alternatives).toEqual(["Ashe"]);
    next = swapAlternative(next, 0, "Ashe");
    expect([next[0]?.apiName, next[0]?.alternatives]).toEqual(["Ashe", ["Ahri"]]);
    expect(removeAlternative(next, 0, "Ahri")[0]?.alternatives).toBeUndefined();
  });
});

describe("builder store migration", () => {
  it("turns v1 single boards into level 8 teams", () => {
    const board = placeChampion(createBoard(), 2, "Ahri");
    const saved = { id: "a", name: "Team", set: 18, board, savedAt: "2026-10-01T00:00:00.000Z" };
    const migrated = migrateV1({ boards: { 18: board }, saved: [saved] });
    expect(migrated.teams[18]).toEqual({ boards: [{ level: DEFAULT_LEVEL, board }], active: 0 });
    expect(migrated.saved).toEqual([
      { id: "a", name: "Team", set: 18, boards: [{ level: DEFAULT_LEVEL, board }], savedAt: saved.savedAt },
    ]);
  });
});

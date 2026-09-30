import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SetData } from "@/lib/data/schema";
import { BOARD_SIZE, MAX_ITEMS } from "@/lib/game/board";
import { ALL_COMPS, ALL_TIER_LISTS } from ".";
import type { CompUnit, TierRows } from "./types";

// Content is validated against live-patch data, which is what the deployed site shows by default.
const DATA_DIR = join(import.meta.dirname, "..", "..", "public", "data", "latest");

function loadSet(set: number): SetData {
  const file = join(DATA_DIR, `set${set}.json`);
  if (!existsSync(file)) {
    throw new Error(
      `Missing ${file}. Run \`npm run data\` first, or the content references a set that isn't generated.`,
    );
  }
  return JSON.parse(readFileSync(file, "utf8")) as SetData;
}

function unitProblems(units: CompUnit[], data: SetData): string[] {
  const champions = new Set(data.champions.map((champion) => champion.apiName));
  const items = new Set(data.items.map((item) => item.apiName));
  const hexes = new Set<number>();
  return units.flatMap((unit) => {
    const problems: string[] = [];
    if (!champions.has(unit.apiName)) problems.push(`unknown champion ${unit.apiName}`);
    if (!Number.isInteger(unit.hex) || unit.hex < 0 || unit.hex >= BOARD_SIZE) problems.push(`invalid hex ${unit.hex}`);
    if (hexes.has(unit.hex)) problems.push(`hex ${unit.hex} used twice`);
    hexes.add(unit.hex);
    if ((unit.items?.length ?? 0) > MAX_ITEMS) problems.push(`${unit.apiName} has more than ${MAX_ITEMS} items`);
    for (const item of unit.items ?? []) if (!items.has(item)) problems.push(`unknown item ${item}`);
    return problems;
  });
}

describe("comps", () => {
  it("have unique slugs", () => {
    const slugs = ALL_COMPS.map((comp) => comp.slug);
    expect(slugs.filter((slug, index) => slugs.indexOf(slug) !== index)).toEqual([]);
  });

  it.each(ALL_COMPS.map((comp) => [comp.slug, comp] as const))("%s references valid game data", (_, comp) => {
    const data = loadSet(comp.set);
    const augments = new Set(data.augments.map((augment) => augment.apiName));
    const problems = [
      ...unitProblems(comp.board, data),
      ...unitProblems(comp.early ?? [], data).map((problem) => `early: ${problem}`),
      ...(comp.augments ?? [])
        .filter((augment) => !augments.has(augment))
        .map((augment) => `unknown augment ${augment}`),
    ];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(comp.updatedAt)) problems.push(`updatedAt must be YYYY-MM-DD`);
    expect(problems).toEqual([]);
  });
});

describe("tier lists", () => {
  it.each(ALL_TIER_LISTS.map((list) => [list.set, list] as const))("set %s references valid game data", (_, list) => {
    const data = loadSet(list.set);
    const known = (names: string[]) => new Set(names);
    const champions = known(data.champions.map((champion) => champion.apiName));
    const items = known(data.items.map((item) => item.apiName));
    const traits = known(
      data.traits.flatMap((trait) => trait.breakpoints.map((breakpoint) => `${trait.apiName}:${breakpoint.minUnits}`)),
    );
    const augments = known(data.augments.map((augment) => augment.apiName));
    const unknown = (rows: TierRows | undefined, valid: Set<string>) =>
      Object.values(rows ?? {}).flatMap((row) => row.filter((entry) => !valid.has(entry)));
    const problems = [
      ...unknown(list.champions, champions),
      ...unknown(list.items, items),
      ...unknown(list.traits, traits),
      ...unknown(list.augments, augments),
    ].map((entry) => `unknown ${entry}`);
    expect(problems).toEqual([]);
  });
});

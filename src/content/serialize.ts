import type { Board } from "@/lib/game/board";
import {
  type CompUnit,
  type Difficulty,
  type Playstyle,
  type Tier,
  type TierList,
  type TierRows,
  TIERS,
} from "./types";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function boardToCompUnits(board: Board, carries: string[] = []): CompUnit[] {
  return board.flatMap((unit, hex) => {
    if (!unit) return [];
    const compUnit: CompUnit = { apiName: unit.apiName, hex };
    if (unit.star > 1) compUnit.star = unit.star;
    if (carries.includes(unit.apiName)) compUnit.carry = true;
    if (unit.items.length > 0) compUnit.items = unit.items;
    if (unit.flex) compUnit.flex = true;
    if (unit.alternatives?.length) compUnit.alternatives = unit.alternatives;
    return [compUnit];
  });
}

const stringList = (values: string[]) => `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;

function formatUnit(unit: CompUnit): string {
  const fields = [`apiName: ${JSON.stringify(unit.apiName)}`, `hex: ${unit.hex}`];
  if (unit.star) fields.push(`star: ${unit.star}`);
  if (unit.carry) fields.push("carry: true");
  if (unit.items) fields.push(`items: ${stringList(unit.items)}`);
  if (unit.flex) fields.push("flex: true");
  if (unit.alternatives) fields.push(`alternatives: ${stringList(unit.alternatives)}`);
  return `{ ${fields.join(", ")} }`;
}

const formatUnits = (board: Board, carries: string[]) =>
  boardToCompUnits(board, carries)
    .map((unit) => `    ${formatUnit(unit)},`)
    .join("\n");

/** What a guide says beyond its boards; the Team Builder's guide editor fills these in. */
export interface GuideDetails {
  name: string;
  tier: Tier;
  playstyle: Playstyle;
  difficulty: Difficulty;
  summary: string;
  /** Augment apiNames, strongest first. */
  augments: string[];
  tips: string[];
  /** Champion apiNames marked `carry: true`. */
  carries: string[];
}

export const EMPTY_GUIDE: GuideDetails = {
  name: "",
  tier: "B",
  playstyle: "Fast 8",
  difficulty: "Medium",
  summary: "",
  augments: [],
  tips: [],
  carries: [],
};

interface CompSourceOptions {
  guide: GuideDetails;
  set: number;
  board: Board;
  early?: Board;
  today?: string;
}

/**
 * Renders a `src/content/comps/set{N}/{slug}.ts` module for a board and its guide details. Run it through
 * `formatContentSource` before committing so it matches the repository's formatting.
 */
export function compSource({
  guide,
  set,
  board,
  early,
  today = new Date().toISOString().slice(0, 10),
}: CompSourceOptions) {
  const slug = `set${set}-${slugify(guide.name) || "new-comp"}`;
  const earlyField = early ? `\n  early: [\n${formatUnits(early, guide.carries)}\n  ],` : "";
  const tips = guide.tips.map((tip) => tip.trim()).filter(Boolean);

  return `import type { Comp } from "../../types";

export default {
  slug: ${JSON.stringify(slug)},
  name: ${JSON.stringify(guide.name.trim() || "New Comp")},
  set: ${set},
  tier: ${JSON.stringify(guide.tier)},
  playstyle: ${JSON.stringify(guide.playstyle)},
  difficulty: ${JSON.stringify(guide.difficulty)},
  summary: ${JSON.stringify(guide.summary.trim())},
  board: [
${formatUnits(board, guide.carries)}
  ],${earlyField}
  augments: ${stringList(guide.augments)},
  tips: ${stringList(tips)},
  updatedAt: ${JSON.stringify(today)},
} satisfies Comp;
`;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A plain value as TypeScript source, objects expanded one key per line; Prettier settles the layout. */
function literal(value: unknown, indent = ""): string {
  if (Array.isArray(value)) return `[${value.map((entry) => literal(entry, indent)).join(", ")}]`;
  if (value && typeof value === "object") {
    const inner = `${indent}  `;
    const fields = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => `${inner}${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${literal(entry, inner)},`);
    return fields.length ? `{\n${fields.join("\n")}\n${indent}}` : "{}";
  }
  return JSON.stringify(value);
}

/** Tiers in S-to-X order, leaving out empty ones; undefined when nothing is left. */
function tierRows(rows: TierRows | undefined): TierRows | undefined {
  const kept = TIERS.flatMap((tier) => (rows?.[tier]?.length ? [[tier, rows[tier]] as const] : []));
  return kept.length ? Object.fromEntries(kept) : undefined;
}

/** Renders a `src/content/tierlists/set{N}.ts` module; run it through `formatContentSource` before committing. */
export function tierListSource(list: TierList): string {
  const fallback = {
    champions: tierRows(list.fallback?.champions),
    items: tierRows(list.fallback?.items),
    traits: tierRows(list.fallback?.traits),
  };
  const ordered = {
    set: list.set,
    champions: tierRows(list.champions),
    items: tierRows(list.items),
    traits: tierRows(list.traits),
    fallback: Object.values(fallback).some(Boolean) ? fallback : undefined,
    augments: tierRows(list.augments) ?? {},
    updatedAt: list.updatedAt,
  };
  return `import type { TierList } from "../types";\n\nexport default ${literal(ordered)} satisfies TierList;\n`;
}

/** Formats a content module the way `npm run format` does, so a file submitted from the site passes CI as is. */
export async function formatContentSource(source: string): Promise<string> {
  // Loaded on demand: Prettier is large and only the content editors need it.
  const [prettier, typescript, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
  ]);
  return prettier.format(source, { parser: "typescript", plugins: [typescript, estree], printWidth: 120 });
}

export const compFileName = (name: string) => `${slugify(name) || "new-comp"}.ts`;

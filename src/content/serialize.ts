import type { Board } from "@/lib/game/board";
import type { CompUnit, Difficulty, Playstyle, Tier } from "./types";

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
 * `formatCompSource` before committing so it matches the repository's formatting.
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

/** Formats a comp module the way `npm run format` does, so a guide submitted from the site passes CI as is. */
export async function formatCompSource(source: string): Promise<string> {
  // Loaded on demand: Prettier is large and only the guide editor needs it.
  const [prettier, typescript, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
  ]);
  return prettier.format(source, { parser: "typescript", plugins: [typescript, estree], printWidth: 120 });
}

export const compFileName = (name: string) => `${slugify(name) || "new-comp"}.ts`;

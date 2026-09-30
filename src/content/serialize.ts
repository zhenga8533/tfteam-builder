import type { Board } from "@/lib/game/board";
import type { CompUnit } from "./types";

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function boardToCompUnits(board: Board): CompUnit[] {
  return board.flatMap((unit, hex) => {
    if (!unit) return [];
    const compUnit: CompUnit = { apiName: unit.apiName, hex };
    if (unit.star > 1) compUnit.star = unit.star;
    if (unit.items.length > 0) compUnit.items = unit.items;
    return [compUnit];
  });
}

function formatUnit(unit: CompUnit): string {
  const fields = [`apiName: ${JSON.stringify(unit.apiName)}`, `hex: ${unit.hex}`];
  if (unit.star) fields.push(`star: ${unit.star}`);
  if (unit.items) fields.push(`items: [${unit.items.map((item) => JSON.stringify(item)).join(", ")}]`);
  return `{ ${fields.join(", ")} }`;
}

interface CompSourceOptions {
  name: string;
  set: number;
  board: Board;
  today?: string;
}

/**
 * Renders a ready-to-commit `src/content/comps/set{N}/{slug}.ts` module for the current board.
 * Tier, playstyle, difficulty and summary are placeholders for the author to fill in.
 */
export function compSource({ name, set, board, today = new Date().toISOString().slice(0, 10) }: CompSourceOptions) {
  const slug = `set${set}-${slugify(name) || "new-comp"}`;
  const units = boardToCompUnits(board)
    .map((unit) => `    ${formatUnit(unit)},`)
    .join("\n");

  return `import type { Comp } from "../../types";

export default {
  slug: ${JSON.stringify(slug)},
  name: ${JSON.stringify(name || "New Comp")},
  set: ${set},
  tier: "B",
  playstyle: "Fast 8",
  difficulty: "Medium",
  summary: "",
  board: [
${units}
  ],
  augments: [],
  tips: [],
  updatedAt: ${JSON.stringify(today)},
} satisfies Comp;
`;
}

export const compFileName = (name: string) => `${slugify(name) || "new-comp"}.ts`;

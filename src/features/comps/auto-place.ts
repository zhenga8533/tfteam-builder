import type { CompUnit } from "@/content/types";
import type { AutoComp, Champion } from "@/lib/data/schema";
import { BOARD_COLS, type StarLevel } from "@/lib/game/board";

/** Columns filled from the middle out, so tanks stack in front of the action. */
const CENTER_OUT = [3, 2, 4, 1, 5, 0, 6];
/** Back-row corners, where carries are safest from melee units and assassins. */
const CORNERS = [0, 6];

/** Rows each line fills, front (row 0) to back (row 3), in the order they're tried. */
const LINE_ROWS = {
  front: [0, 1],
  // Mid-range units stand just behind the frontline, close enough to reach past it.
  middle: [1, 2],
  back: [3, 2],
} as const;
type Line = keyof typeof LINE_ROWS;

const MELEE_RANGE = 1;
const MID_RANGE = 3;

const slotsIn = (rows: readonly number[], columns = CENTER_OUT) =>
  rows.flatMap((row) => columns.map((col) => row * BOARD_COLS + col));
const EVERYWHERE = slotsIn([3, 2, 0, 1]);

function lineOf(champion: Champion | undefined): Line {
  const range = champion?.stats.range ?? MID_RANGE + 1;
  return range <= MELEE_RANGE ? "front" : range <= MID_RANGE ? "middle" : "back";
}

/** Hexes in the order a unit would be placed: melee front and centre, mid-range behind them, ranged at the back. */
export const placementOrder = (champion: Champion | undefined) => [
  ...slotsIn(LINE_ROWS[lineOf(champion)]),
  ...EVERYWHERE,
];

/**
 * Match data has no positions, so lay out a board the way most players would: melee units in the front two rows
 * (tanks centered), mid-range units behind them, ranged units in the back, and ranged carries in the back corners.
 * Units with a known hex in `positions` (e.g. from a hand-written guide for the comp) keep it.
 */
export function autoPlace(
  units: Omit<CompUnit, "hex">[],
  championsByApi: Map<string, Champion>,
  positions: Map<string, number> = new Map(),
): CompUnit[] {
  const taken = new Set<number>();
  const placed: CompUnit[] = [];
  const place = (unit: Omit<CompUnit, "hex">, slots: number[]) => {
    const hex = slots.find((slot) => !taken.has(slot));
    if (hex === undefined) return;
    taken.add(hex);
    placed.push({ ...unit, hex });
  };
  const champion = (unit: Omit<CompUnit, "hex">) => championsByApi.get(unit.apiName);

  for (const unit of units) {
    const hex = positions.get(unit.apiName);
    if (hex !== undefined) place(unit, [hex]);
  }
  const unplaced = units.filter((unit) => !placed.some((entry) => entry.apiName === unit.apiName));
  const inLine = (line: Line) =>
    unplaced
      .filter((unit) => lineOf(champion(unit)) === line)
      // Supports and tanks take the centre first, leaving the flanks to carries.
      .sort((a, b) => Number(Boolean(a.carry)) - Number(Boolean(b.carry)));
  const back = inLine("back");

  for (const unit of back.filter((unit) => unit.carry))
    place(unit, [...slotsIn([LINE_ROWS.back[0]], CORNERS), ...EVERYWHERE]);
  for (const unit of [...back.filter((unit) => !unit.carry), ...inLine("middle"), ...inLine("front")])
    place(unit, placementOrder(champion(unit)));
  return placed;
}

/** Each unit's hex on a board, for `autoPlace` to keep. */
const boardPositions = (board: CompUnit[]) => new Map(board.map((unit) => [unit.apiName, unit.hex]));

/** A detected comp's core board as placeable units, carries flagged, positioned like `guide` where it has them. */
export function autoCompUnits(comp: AutoComp, championsByApi: Map<string, Champion>, guide?: CompUnit[]): CompUnit[] {
  return autoPlace(
    comp.units.map((unit) => ({
      apiName: unit.apiName,
      star: Math.min(Math.max(unit.star, 1), 3) as StarLevel,
      items: unit.items,
      carry: comp.carries.includes(unit.apiName),
    })),
    championsByApi,
    guide && boardPositions(guide),
  );
}

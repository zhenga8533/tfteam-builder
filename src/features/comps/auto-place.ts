import type { CompUnit } from "@/content/types";
import type { AutoComp, Champion } from "@/lib/data/schema";
import { BOARD_COLS, type StarLevel } from "@/lib/game/board";

/** Columns filled from the middle out, so tanks stack in front of the action. */
const CENTER_OUT = [3, 2, 4, 1, 5, 0, 6];
/** Back-row corners, where carries are safest from melee units and assassins. */
const CORNERS = [0, 6];

const FRONT_ROWS = [0, 1];
const BACK_ROWS = [3, 2];
const MELEE_RANGE = 1;

/**
 * Match data has no positions, so lay out a board the way most players would: melee units in the
 * front two rows (tanks centered), ranged units in the back, and carries in the back corners.
 */
export function autoPlace(units: Omit<CompUnit, "hex">[], championsByApi: Map<string, Champion>): CompUnit[] {
  const taken = new Set<number>();
  const placed: CompUnit[] = [];
  const place = (unit: Omit<CompUnit, "hex">, slots: number[]) => {
    const hex = slots.find((slot) => !taken.has(slot));
    if (hex === undefined) return false;
    taken.add(hex);
    placed.push({ ...unit, hex });
    return true;
  };
  const slotsIn = (rows: number[], columns = CENTER_OUT) =>
    rows.flatMap((row) => columns.map((col) => row * BOARD_COLS + col));
  const everywhere = slotsIn([...BACK_ROWS, ...FRONT_ROWS]);

  const isMelee = (unit: Omit<CompUnit, "hex">) => (championsByApi.get(unit.apiName)?.stats.range ?? 4) <= MELEE_RANGE;
  const ranged = units.filter((unit) => !isMelee(unit));
  const melee = units.filter(isMelee).sort((a, b) => Number(Boolean(a.carry)) - Number(Boolean(b.carry)));

  for (const unit of ranged.filter((unit) => unit.carry))
    place(unit, [...slotsIn([BACK_ROWS[0]!], CORNERS), ...everywhere]);
  for (const unit of ranged.filter((unit) => !unit.carry)) place(unit, [...slotsIn(BACK_ROWS), ...everywhere]);
  for (const unit of melee) place(unit, [...slotsIn(FRONT_ROWS), ...everywhere]);
  return placed;
}

/** A detected comp's core board as placeable units, carries flagged. */
export function autoCompUnits(comp: AutoComp, championsByApi: Map<string, Champion>): CompUnit[] {
  return autoPlace(
    comp.units.map((unit) => ({
      apiName: unit.apiName,
      star: Math.min(Math.max(unit.star, 1), 3) as StarLevel,
      items: unit.items,
      carry: comp.carries.includes(unit.apiName),
    })),
    championsByApi,
  );
}

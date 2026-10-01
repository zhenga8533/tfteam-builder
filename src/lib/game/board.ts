import type { Champion, Item } from "@/lib/data/schema";

export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;
export const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;
export const MAX_ITEMS = 3;
export const STAR_LEVELS = [1, 2, 3] as const;

export type StarLevel = (typeof STAR_LEVELS)[number];

export interface BoardUnit {
  apiName: string;
  star: StarLevel;
  items: string[];
  /** An optional slot: shown on the board, but its traits are counted separately. */
  flex?: boolean;
  /** Champions that can stand in for this unit (e.g. "Sett or Rammus"). */
  alternatives?: string[];
}

/** One board of a team at a given player level (e.g. a level 6 early board and a level 8 final board). */
export interface LevelBoard {
  level: number;
  board: Board;
}

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

/** Hexes in row-major order; index = row * BOARD_COLS + col. */
export type Board = (BoardUnit | null)[];

export const createBoard = (): Board => Array.from({ length: BOARD_SIZE }, () => null);

export const boardUnits = (board: Board): BoardUnit[] => board.filter((unit): unit is BoardUnit => unit !== null);

const update = (board: Board, index: number, unit: BoardUnit | null): Board =>
  board.map((current, i) => (i === index ? unit : current));

export const placeChampion = (board: Board, index: number, apiName: string): Board =>
  update(board, index, { apiName, star: 1, items: [] });

/** Places a champion on the first free hex, or returns null when the board is full. */
export function addChampion(board: Board, apiName: string): Board | null {
  const index = board.findIndex((unit) => unit === null);
  return index === -1 ? null : placeChampion(board, index, apiName);
}

export function moveUnit(board: Board, from: number, to: number): Board {
  if (from === to) return board;
  const next = [...board];
  [next[from], next[to]] = [next[to] ?? null, next[from] ?? null];
  return next;
}

export const removeUnit = (board: Board, index: number): Board => update(board, index, null);

export function setStar(board: Board, index: number, star: StarLevel): Board {
  const unit = board[index];
  return unit ? update(board, index, { ...unit, star }) : board;
}

/** Returns why `item` can't be equipped on `unit`, or null when it can. */
export function equipBlocker(unit: BoardUnit, champion: Champion, item: Item): string | null {
  if (unit.items.length >= MAX_ITEMS) return `${champion.name} already holds ${MAX_ITEMS} items.`;
  if (item.unique && unit.items.includes(item.apiName)) return `${item.name} is unique.`;
  if (item.trait && (champion.traits.includes(item.trait) || unit.items.includes(item.apiName))) {
    return `${champion.name} already has that trait.`;
  }
  return null;
}

export function equipItem(board: Board, index: number, itemApiName: string): Board {
  const unit = board[index];
  return unit ? update(board, index, { ...unit, items: [...unit.items, itemApiName] }) : board;
}

export function unequipItem(board: Board, index: number, itemIndex: number): Board {
  const unit = board[index];
  return unit ? update(board, index, { ...unit, items: unit.items.filter((_, i) => i !== itemIndex) }) : board;
}

/** Gold spent on the board: a 2★ costs three copies, a 3★ nine. */
export function teamCost(units: BoardUnit[], championsByApi: Map<string, Champion>): number {
  return units.reduce((total, unit) => total + (championsByApi.get(unit.apiName)?.cost ?? 0) * 3 ** (unit.star - 1), 0);
}

export function toggleFlex(board: Board, index: number): Board {
  const unit = board[index];
  return unit ? update(board, index, { ...unit, flex: !unit.flex }) : board;
}

export function addAlternative(board: Board, index: number, apiName: string): Board {
  const unit = board[index];
  if (!unit || unit.apiName === apiName || unit.alternatives?.includes(apiName)) return board;
  return update(board, index, { ...unit, alternatives: [...(unit.alternatives ?? []), apiName] });
}

export function removeAlternative(board: Board, index: number, apiName: string): Board {
  const unit = board[index];
  if (!unit) return board;
  const alternatives = (unit.alternatives ?? []).filter((alternative) => alternative !== apiName);
  return update(board, index, { ...unit, alternatives: alternatives.length ? alternatives : undefined });
}

/** Makes an alternative the main pick; the previous main pick becomes an alternative. Items stay. */
export function swapAlternative(board: Board, index: number, apiName: string): Board {
  const unit = board[index];
  if (!unit?.alternatives?.includes(apiName)) return board;
  const alternatives = unit.alternatives.map((alternative) => (alternative === apiName ? unit.apiName : alternative));
  return update(board, index, { ...unit, apiName, alternatives });
}

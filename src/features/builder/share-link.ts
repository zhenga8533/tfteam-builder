import { BOARD_SIZE, type BoardUnit, createBoard, type LevelBoard, MAX_ITEMS, type StarLevel } from "@/lib/game/board";

/** `[hex, apiName, star, items, flex, alternatives]`, with trailing defaults dropped to keep links short. */
type SharedUnit = [number, string, number?, string[]?, 1?, string[]?];
interface SharedTeam {
  v: 1;
  set: number;
  boards: [level: number, units: SharedUnit[]][];
}

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (code: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)),
  );

function shareUnit(hex: number, unit: BoardUnit): SharedUnit {
  const shared: SharedUnit = [hex, unit.apiName, unit.star, unit.items, unit.flex ? 1 : undefined, unit.alternatives];
  while (shared.length > 2) {
    const last = shared.at(-1);
    const isDefault =
      last === undefined || (Array.isArray(last) && last.length === 0) || (shared.length === 3 && last === 1);
    if (!isDefault) break;
    shared.pop();
  }
  return shared;
}

/** A URL-safe code for a team's level boards, for `/builder?team=…` links. */
export function encodeShareCode(set: number, boards: LevelBoard[]): string {
  const team: SharedTeam = {
    v: 1,
    set,
    boards: boards.map(({ level, board }) => [
      level,
      board.flatMap((unit, hex) => (unit ? [shareUnit(hex, unit)] : [])),
    ]),
  };
  return toBase64Url(JSON.stringify(team));
}

export type ShareDecodeResult = { ok: true; set: number; boards: LevelBoard[] } | { ok: false; error: string };

/** Reads a share code; champions not in `known` (e.g. after a patch removed them) are skipped. */
export function decodeShareCode(code: string, known: (apiName: string) => boolean): ShareDecodeResult {
  let team: SharedTeam;
  try {
    team = JSON.parse(fromBase64Url(code)) as SharedTeam;
  } catch {
    return { ok: false, error: "That team link is incomplete or broken." };
  }
  if (team?.v !== 1 || !Number.isInteger(team.set) || !Array.isArray(team.boards) || team.boards.length === 0) {
    return { ok: false, error: "That team link is incomplete or broken." };
  }
  const boards = team.boards.map(([level, units]) => {
    const board = createBoard();
    for (const [hex, apiName, star = 1, items = [], flex, alternatives] of units ?? []) {
      if (!Number.isInteger(hex) || hex < 0 || hex >= BOARD_SIZE || !known(apiName)) continue;
      board[hex] = {
        apiName,
        star: (star >= 1 && star <= 3 ? star : 1) as StarLevel,
        items: items.slice(0, MAX_ITEMS),
        ...(flex && { flex: true }),
        ...(alternatives?.length && { alternatives: alternatives.filter(known) }),
      };
    }
    return { level: Number(level), board };
  });
  return { ok: true, set: team.set, boards };
}

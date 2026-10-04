import type { Champion } from "@/lib/data/schema";

/** The in-game Team Planner holds at most this many champions. */
const TEAM_CODE_SLOTS = 10;

const CODE_PATTERN = /^0[0-9a-f]([0-9a-f]+)TFTSet(\d+)$/i;

/**
 * Sets up to 17 use two hex digits per champion with a `01` prefix. Later sets assign planner codes
 * above 0xFF, which need three digits; those codes use a `02` prefix.
 */
const digitsFor = (champions: Champion[]) => (champions.some((champion) => (champion.plannerCode ?? 0) > 0xff) ? 3 : 2);

export const supportsTeamCodes = (champions: Champion[]) => champions.some((champion) => champion.plannerCode);

export function encodeTeamCode(apiNames: string[], champions: Champion[], set: number): string {
  const byApi = new Map(champions.map((champion) => [champion.apiName, champion]));
  const digits = digitsFor(champions);
  // The Team Planner only knows shop champions, so a form ("Lux (Coven)") is planned as its base.
  const plannerCode = (apiName: string) => {
    const champion = byApi.get(apiName);
    return champion?.plannerCode ?? (champion?.formOf ? byApi.get(champion.formOf)?.plannerCode : undefined);
  };
  const codes = [...new Set(apiNames.flatMap((apiName) => plannerCode(apiName) ?? []))].slice(0, TEAM_CODE_SLOTS);
  const slots = Array.from({ length: TEAM_CODE_SLOTS }, (_, i) => (codes[i] ?? 0).toString(16).padStart(digits, "0"));
  return `0${digits === 3 ? 2 : 1}${slots.join("")}TFTSet${set}`;
}

/** Reads the set number from a code without decoding its champions. */
export function teamCodeSet(code: string): number | null {
  const set = code.trim().match(CODE_PATTERN)?.[2];
  return set ? Number(set) : null;
}

export type DecodeResult = { ok: true; set: number; apiNames: string[] } | { ok: false; error: string };

export function decodeTeamCode(code: string, champions: Champion[]): DecodeResult {
  const match = code.trim().match(CODE_PATTERN);
  if (!match) return { ok: false, error: "That doesn't look like a Team Planner code." };

  const [, payload = "", setNumber] = match;
  if (payload.length % TEAM_CODE_SLOTS !== 0) return { ok: false, error: "The Team Planner code is malformed." };
  // Infer the per-slot width from the payload instead of trusting the prefix, so both formats decode.
  const digits = payload.length / TEAM_CODE_SLOTS;

  const byCode = new Map(
    champions.flatMap((champion) => (champion.plannerCode ? [[champion.plannerCode, champion]] : [])),
  );
  const apiNames: string[] = [];
  for (let i = 0; i < payload.length; i += digits) {
    const value = parseInt(payload.slice(i, i + digits), 16);
    if (value === 0) continue;
    const champion = byCode.get(value);
    if (!champion)
      return { ok: false, error: `Unknown champion in code (${value.toString(16)}). Is it from another set?` };
    apiNames.push(champion.apiName);
  }
  return { ok: true, set: Number(setNumber), apiNames };
}

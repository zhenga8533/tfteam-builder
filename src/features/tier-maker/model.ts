import { type Tier, type TierList, type TierRows, TIERS } from "@/content/types";
import { fromBase64Url, toBase64Url } from "@/lib/base64url";

export const MAKER_KINDS = ["champions", "items", "traits", "augments"] as const;
export type MakerKind = (typeof MAKER_KINDS)[number];

export const isMakerKind = (value: unknown): value is MakerKind => MAKER_KINDS.includes(value as MakerKind);

/** Where an entry sits: a tier, or null for the unranked pool. */
export type Slot = Tier | null;

export const tierOf = (rows: TierRows, key: string): Slot => TIERS.find((tier) => rows[tier]?.includes(key)) ?? null;

/** Moves `key` into `tier` (null: back to the pool), before `before` when it's in that tier, else at the end. */
export function moveEntry(rows: TierRows, key: string, tier: Slot, before?: string): TierRows {
  const next: TierRows = {};
  for (const current of TIERS) {
    const kept = (rows[current] ?? []).filter((entry) => entry !== key);
    if (current === tier) {
      const at = before ? kept.indexOf(before) : -1;
      kept.splice(at === -1 ? kept.length : at, 0, key);
    }
    if (kept.length) next[current] = kept;
  }
  return next;
}

/**
 * The overrides that turn the stats' tiers into `rows`: every entry placed in a different tier than its stats
 * give it. Entries the stats rank but `rows` leaves unranked can't be expressed (overrides only move entries),
 * so they're returned separately.
 */
export function overridesFor(rows: TierRows, statTiers: Map<string, Tier | undefined>) {
  const overrides: TierRows = {};
  for (const tier of TIERS) {
    const moved = (rows[tier] ?? []).filter((key) => statTiers.get(key) !== tier);
    if (moved.length) overrides[tier] = moved;
  }
  const unranked = [...statTiers].flatMap(([key, tier]) => (tier && !tierOf(rows, key) ? [key] : []));
  return { overrides, unranked };
}

/** How a stats-based list is saved: as overrides on top of the stats, or as the list shown without stats. */
export type ExportMode = "overrides" | "fallback";

interface ExportOptions {
  /** The set's tier list file as it is now, if there is one. */
  existing: TierList | undefined;
  set: number;
  kind: MakerKind;
  rows: TierRows;
  mode: ExportMode;
  /** Stats tiers, for working out overrides; null when the list isn't stats-based. */
  statTiers: Map<string, Tier | undefined> | null;
  today: string;
}

/**
 * The set's tier list file with one section replaced by `rows`: the augment list, a fallback list, or the minimal
 * overrides that reproduce `rows` on top of the stats. Every other section is kept as it was.
 */
export function exportTierList({ existing, set, kind, rows, mode, statTiers, today }: ExportOptions) {
  const list: TierList = { ...(existing ?? { set, augments: {} }), updatedAt: today };
  if (kind === "augments") return { list: { ...list, augments: rows }, unranked: [] };
  if (mode === "fallback" || !statTiers) {
    return { list: { ...list, fallback: { ...list.fallback, [kind]: rows } }, unranked: [] };
  }
  const { overrides, unranked } = overridesFor(rows, statTiers);
  return { list: { ...list, [kind]: overrides }, unranked };
}

interface SharedTierList {
  v: 1;
  set: number;
  kind: MakerKind;
  rows: TierRows;
}

/** A URL-safe code for a tier list, for `/tools/tier-list?list=…` links. */
export const encodeTierListCode = (set: number, kind: MakerKind, rows: TierRows) =>
  toBase64Url(JSON.stringify({ v: 1, set, kind, rows } satisfies SharedTierList));

export type TierListDecodeResult =
  { ok: true; set: number; kind: MakerKind; rows: TierRows } | { ok: false; error: string };

/** Reads a tier list code; entries not in `known` (e.g. removed by a patch) are dropped. */
export function decodeTierListCode(code: string, known: (key: string) => boolean): TierListDecodeResult {
  const broken = { ok: false, error: "That tier list link is incomplete or broken." } as const;
  let shared: SharedTierList;
  try {
    shared = JSON.parse(fromBase64Url(code)) as SharedTierList;
  } catch {
    return broken;
  }
  if (
    shared?.v !== 1 ||
    !Number.isInteger(shared.set) ||
    !isMakerKind(shared.kind) ||
    typeof shared.rows !== "object"
  ) {
    return broken;
  }
  const rows: TierRows = {};
  for (const tier of TIERS) {
    const entries = shared.rows[tier];
    const kept = Array.isArray(entries)
      ? [...new Set(entries.filter((key) => typeof key === "string" && known(key)))]
      : [];
    if (kept.length) rows[tier] = kept;
  }
  return { ok: true, set: shared.set, kind: shared.kind, rows };
}

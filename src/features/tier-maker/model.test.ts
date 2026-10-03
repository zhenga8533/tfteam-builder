import { describe, expect, it } from "vitest";
import type { Tier } from "@/content/types";
import { decodeTierListCode, encodeTierListCode, exportTierList, moveEntry, overridesFor, tierOf } from "./model";

describe("moveEntry", () => {
  const rows = { S: ["a", "b"], A: ["c"] };

  it("moves between tiers, dropping rows left empty", () => {
    expect(moveEntry(rows, "c", "S")).toEqual({ S: ["a", "b", "c"] });
  });

  it("inserts before another entry, including within the same tier", () => {
    expect(moveEntry(rows, "c", "S", "b")).toEqual({ S: ["a", "c", "b"] });
    expect(moveEntry(rows, "b", "S", "a")).toEqual({ S: ["b", "a"], A: ["c"] });
  });

  it("sends entries to the pool and reports where an entry sits", () => {
    const next = moveEntry(rows, "a", null);
    expect(next).toEqual({ S: ["b"], A: ["c"] });
    expect(tierOf(next, "a")).toBeNull();
    expect(tierOf(next, "c")).toBe("A");
  });
});

describe("overridesFor", () => {
  const stats = new Map<string, Tier | undefined>([
    ["a", "S"],
    ["b", "A"],
    ["c", "B"],
    ["rare", undefined],
  ]);

  it("keeps only entries placed away from their stats tier", () => {
    const { overrides, unranked } = overridesFor({ S: ["a", "b"], B: ["c", "rare"] }, stats);
    expect(overrides).toEqual({ S: ["b"], B: ["rare"] });
    expect(unranked).toEqual([]);
  });

  it("reports ranked entries left unranked, which overrides can't express", () => {
    expect(overridesFor({ S: ["a"] }, stats).unranked).toEqual(["b", "c"]);
  });
});

describe("tier list codes", () => {
  it("round-trips and drops unknown or repeated entries", () => {
    const code = encodeTierListCode(18, "augments", { S: ["a", "gone", "a"], B: ["b"] });
    expect(decodeTierListCode(code, (key) => key !== "gone")).toEqual({
      ok: true,
      set: 18,
      kind: "augments",
      rows: { S: ["a"], B: ["b"] },
    });
  });

  it("rejects broken codes", () => {
    expect(decodeTierListCode("not-a-code", () => true).ok).toBe(false);
    expect(decodeTierListCode(encodeTierListCode(18, "augments", {}).slice(0, 5), () => true).ok).toBe(false);
  });
});

describe("exportTierList", () => {
  const existing = {
    set: 18,
    champions: { S: ["old"] },
    fallback: { items: { A: ["x"] } },
    augments: { S: ["aug"] },
    updatedAt: "2026-09-30",
  };
  const statTiers = new Map<string, Tier | undefined>([
    ["a", "S"],
    ["b", "A"],
  ]);
  const base = { existing, set: 18, today: "2026-10-03", statTiers };

  it("replaces only the edited section and stamps the date", () => {
    const { list } = exportTierList({ ...base, kind: "augments", rows: { A: ["aug"] }, mode: "overrides" });
    expect(list).toEqual({ ...existing, augments: { A: ["aug"] }, updatedAt: "2026-10-03" });
  });

  it("writes the minimal overrides for a stats-based list", () => {
    const { list, unranked } = exportTierList({
      ...base,
      kind: "champions",
      rows: { S: ["a", "b"] },
      mode: "overrides",
    });
    expect(list.champions).toEqual({ S: ["b"] });
    expect(list.fallback).toEqual(existing.fallback);
    expect(unranked).toEqual([]);
  });

  it("writes a fallback, keeping other kinds' fallbacks, and starts a file for a new set", () => {
    const { list } = exportTierList({ ...base, kind: "champions", rows: { S: ["a"] }, mode: "fallback" });
    expect(list.fallback).toEqual({ items: { A: ["x"] }, champions: { S: ["a"] } });
    expect(list.champions).toEqual(existing.champions);
    const fresh = exportTierList({ ...base, existing: undefined, set: 19, kind: "items", rows: {}, mode: "fallback" });
    expect(fresh.list).toEqual({ set: 19, augments: {}, fallback: { items: {} }, updatedAt: "2026-10-03" });
  });
});

import { describe, expect, it } from "vitest";
import { mergeTiers, tierListRows } from "./tiers";

describe("mergeTiers", () => {
  it("moves overridden entries to their manual tier and keeps generated order otherwise", () => {
    const generated = [
      { key: "a", tier: "S" as const },
      { key: "b", tier: "A" as const },
      { key: "c", tier: "A" as const },
      { key: "untiered" },
    ];
    expect(mergeTiers(generated, { S: ["c"], X: ["b"] })).toEqual({ S: ["c", "a"], X: ["b"] });
  });

  it("returns only manual rows when there are no stats", () => {
    expect(mergeTiers([], { B: ["x"] })).toEqual({ B: ["x"] });
  });
});

describe("tierListRows", () => {
  const generated = [
    { key: "a", tier: "S" as const },
    { key: "b", tier: "A" as const },
  ];

  it("pins overrides over the stats and ignores the fallback", () => {
    const result = tierListRows({ generated, hasStats: true, overrides: { C: ["a"] }, fallback: { S: ["z"] } });
    expect(result.rows).toEqual({ A: ["b"], C: ["a"] });
    expect([...result.pinned]).toEqual(["a"]);
    expect(result.usingFallback).toBe(false);
  });

  it("shows only the fallback without stats, with nothing pinned", () => {
    const result = tierListRows({ generated: [], hasStats: false, overrides: { C: ["a"] }, fallback: { S: ["z"] } });
    expect(result).toEqual({ rows: { S: ["z"] }, pinned: new Set(), usingFallback: true });
  });

  it("keeps the fallback out when filters only narrow the stats", () => {
    expect(tierListRows({ generated: [], hasStats: true, fallback: { S: ["z"] } }).rows).toEqual({});
  });
});

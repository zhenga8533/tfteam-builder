import { describe, expect, it } from "vitest";
import { mergeTiers } from "./tiers";

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

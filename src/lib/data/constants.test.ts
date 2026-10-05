import { describe, expect, it } from "vitest";
import { isStale } from "./constants";

describe("isStale", () => {
  it("flags stats with no new games for over a day", () => {
    const now = Date.parse("2026-10-05T12:00:00Z");
    expect(isStale("2026-10-05T00:00:00Z", now)).toBe(false);
    expect(isStale("2026-10-04T11:00:00Z", now)).toBe(true);
  });
});

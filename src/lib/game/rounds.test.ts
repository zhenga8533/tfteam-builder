import { describe, expect, it } from "vitest";
import { stageRound } from "./rounds";

describe("stageRound", () => {
  it("maps round counts onto stages", () => {
    expect([1, 4, 5, 11, 12, 30].map(stageRound)).toEqual(["1-1", "1-4", "2-1", "2-7", "3-1", "5-5"]);
  });
});

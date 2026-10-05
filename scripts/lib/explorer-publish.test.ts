import { describe, expect, it } from "vitest";
import { explorerHeaders, staleKeys } from "./explorer-publish.ts";

describe("staleKeys", () => {
  it("keeps the newest builds' folders, ordered by run ID rather than as text", () => {
    const keys = ["9/set18/explorer/totals.json", "10/set18/explorer/totals.json", "11/a", "11/b", "8/a"];
    expect(staleKeys(keys, 2)).toEqual(["9/set18/explorer/totals.json", "8/a"]);
    expect(staleKeys(keys)).toEqual(["8/a"]);
  });

  it("never treats frozen sets' archive as a build", () => {
    expect(staleKeys(["archive/set17/explorer/totals.json", "12/a", "11/a"], 1)).toEqual(["11/a"]);
  });
});

describe("explorerHeaders", () => {
  it("serves JSON as JSON and board files as bytes, cached for good", () => {
    expect(explorerHeaders("set18/explorer/totals.json")["Content-Type"]).toBe("application/json");
    expect(explorerHeaders("set18/explorer/champions/Ahri.bin.gz")).toEqual({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });
});

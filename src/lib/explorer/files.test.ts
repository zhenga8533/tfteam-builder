import { describe, expect, it } from "vitest";
import { explorerFiles } from "./files";

describe("explorerFiles", () => {
  it("reads a champion's or trait's file for every rank at or above the floor", () => {
    expect(explorerFiles({ type: "champion", apiName: "Ahri" }, "diamond")).toEqual([
      "explorer/champions/Ahri/master.bin.gz",
      "explorer/champions/Ahri/diamond.bin.gz",
    ]);
    expect(explorerFiles({ type: "trait", apiName: "Blossom" }, "master")).toEqual([
      "explorer/traits/Blossom/master.bin.gz",
    ]);
  });

  it("reads the totals alone, whatever the floor", () => {
    expect(explorerFiles({ type: "totals" }, "emerald")).toEqual(["explorer/totals.json"]);
  });
});

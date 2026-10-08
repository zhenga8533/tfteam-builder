import { describe, expect, it } from "vitest";
import { resolveActiveSet } from "./active-set";
import type { Manifest } from "./schema";

const manifest = {
  generatedAt: "",
  patches: {
    latest: { version: "16.19", label: "18.4", sets: [18, 17] },
    pbe: { version: "16.20", label: "19.1", sets: [19, 18, 17] },
  },
} as Manifest;

describe("resolveActiveSet", () => {
  it("follows the newest set, labelled with its patch", () => {
    expect(resolveActiveSet(manifest, "latest", null)).toMatchObject({
      patch: "latest",
      set: 18,
      label: "18.4",
      current: true,
    });
    expect(resolveActiveSet(manifest, "pbe", null)).toMatchObject({
      patch: "pbe",
      set: 19,
      label: "19.1",
      current: true,
    });
  });

  it("shows older sets with live data, keeping the chosen patch's set list", () => {
    expect(resolveActiveSet(manifest, "pbe", 18)).toMatchObject({
      patch: "latest",
      set: 18,
      current: true,
      sets: [19, 18, 17],
    });
    expect(resolveActiveSet(manifest, "pbe", 17)).toMatchObject({ patch: "latest", set: 17, current: false });
    expect(resolveActiveSet(manifest, "latest", 17)).toMatchObject({ patch: "latest", set: 17, current: false });
  });

  it("falls back to the newest set when the chosen one isn't there", () => {
    expect(resolveActiveSet(manifest, "latest", 12)).toMatchObject({ set: 18 });
  });
});

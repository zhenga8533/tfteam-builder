import { describe, expect, it } from "vitest";
import type { Champion } from "@/lib/data/schema";
import { autoPlace } from "./auto-place";

const champion = (apiName: string, range: number) => ({ apiName, stats: { range } }) as unknown as Champion;
const championsByApi = new Map(
  [champion("Tank", 1), champion("Bruiser", 1), champion("Mage", 4), champion("Carry", 4), champion("Diver", 1)].map(
    (c) => [c.apiName, c],
  ),
);

describe("autoPlace", () => {
  const placed = new Map(
    autoPlace(
      [
        { apiName: "Mage" },
        { apiName: "Carry", carry: true },
        { apiName: "Tank" },
        { apiName: "Bruiser" },
        { apiName: "Diver", carry: true },
      ],
      championsByApi,
    ).map((unit) => [unit.apiName, unit.hex]),
  );
  const row = (name: string) => Math.floor(placed.get(name)! / 7);
  const col = (name: string) => placed.get(name)! % 7;

  it("puts ranged carries in a back corner and other ranged units in the back row", () => {
    expect([row("Carry"), col("Carry")]).toEqual([3, 0]);
    expect(row("Mage")).toBe(3);
  });

  it("puts melee units in front with tanks before melee carries in the center", () => {
    expect([row("Tank"), col("Tank")]).toEqual([0, 3]);
    expect([row("Bruiser"), col("Bruiser")]).toEqual([0, 2]);
    expect(row("Diver")).toBe(0);
  });

  it("never stacks two units on one hex", () => {
    expect(new Set(placed.values()).size).toBe(placed.size);
  });
});

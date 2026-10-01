import { describe, expect, it } from "vitest";
import { decodeExplorer, encodeExplorer, type ExplorerBoard, ITEM_SLOTS } from "./format";

const boards: ExplorerBoard[] = [
  {
    placement: 1,
    level: 9,
    units: [
      { apiName: "Ahri", star: 2, items: ["JG", "BB", "Rab"] },
      { apiName: "Sett", star: 1, items: [] },
    ],
    traits: [{ apiName: "Blossom", minUnits: 5 }],
  },
  { placement: 8, level: 7, units: [{ apiName: "Sett", star: 3, items: ["BB"] }], traits: [] },
];

describe("explorer format", () => {
  it("round-trips boards losslessly", () => {
    const encoded = encodeExplorer(boards);
    // Copy into a fresh, exactly-sized buffer as the browser would after decompressing.
    const data = decodeExplorer(encoded.slice().buffer);

    expect(data.boards).toBe(2);
    expect([...data.placement]).toEqual([1, 8]);
    expect([...data.level]).toEqual([9, 7]);
    expect([...data.unitStart]).toEqual([0, 2, 3]);
    expect([...data.traitStart]).toEqual([0, 1, 1]);

    const decodedUnits = [...data.unitIndex].map((index, row) => ({
      apiName: data.units[index],
      star: data.unitStar[row],
      items: [...data.unitItems.subarray(row * ITEM_SLOTS, (row + 1) * ITEM_SLOTS)]
        .filter(Boolean)
        .map((slot) => data.items[slot - 1]),
    }));
    expect(decodedUnits).toEqual([...boards[0]!.units, ...boards[1]!.units]);
    expect(data.traits[data.traitIndex[0]!]).toBe("Blossom");
    expect(data.traitMinUnits[0]).toBe(5);
  });

  it("rejects data that isn't in this format", () => {
    expect(() => decodeExplorer(new Uint8Array(16).buffer)).toThrow(/Unsupported/);
  });
});

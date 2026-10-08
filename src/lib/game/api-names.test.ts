import { describe, expect, it } from "vitest";
import { setOfApiName } from "./api-names";

describe("setOfApiName", () => {
  it("reads the set from set-specific apiNames", () => {
    expect(setOfApiName("TFT17_Aatrox")).toBe(17);
    expect(setOfApiName("DA_18_Veigar")).toBe(18);
    expect(setOfApiName("TFT9_Consumable_GoldenItemRemover")).toBe(9);
  });

  it("has no set for shared apiNames", () => {
    expect(setOfApiName("TFT_Item_InfinityEdge")).toBeUndefined();
    expect(setOfApiName("Fishbones")).toBeUndefined();
  });
});

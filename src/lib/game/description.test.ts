import { describe, expect, it } from "vitest";
import { createResolver, formatNumber, parseDescription } from "./description";

describe("parseDescription", () => {
  it("splits lines on <br> and collapses blank runs", () => {
    const lines = parseDescription("First<br><br><br>Second");
    expect(lines).toEqual([
      [{ type: "text", text: "First", style: undefined }],
      [],
      [{ type: "text", text: "Second", style: undefined }],
    ]);
  });

  it("applies styles from nested tags", () => {
    const [line] = parseDescription("Deals <magicDamage>200 magic</magicDamage> and <TFTKeyword>Burn</TFTKeyword>");
    expect(line).toEqual([
      { type: "text", text: "Deals ", style: undefined },
      { type: "text", text: "200 magic", style: "magic" },
      { type: "text", text: " and ", style: undefined },
      { type: "text", text: "Burn", style: "keyword" },
    ]);
  });

  it("emits stat icons and resolves variables case-insensitively with multipliers", () => {
    const resolve = createResolver({ Damage: [0, 100, 150, 225], healthbonus: 0.25 });
    const [line] = parseDescription("Hit for @damage@ %i:scaleAP% and gain @HealthBonus*100@%", resolve);
    expect(line).toEqual([
      { type: "text", text: "Hit for ", style: undefined },
      { type: "value", values: [0, 100, 150, 225], style: undefined },
      { type: "text", text: " ", style: undefined },
      { type: "stat", stat: "scaleAP" },
      { type: "text", text: " and gain ", style: undefined },
      { type: "value", values: [25], style: undefined },
      { type: "text", text: "%", style: undefined },
    ]);
  });

  it("marks unknown and unit-property variables as unresolved and drops template keywords", () => {
    const [line] = parseDescription("A @Missing@ B @TFTUnitProperty.:Foo@{{TFT_Keyword_Chill}}");
    expect(line).toEqual([
      { type: "text", text: "A ", style: undefined },
      { type: "value", values: null, style: undefined },
      { type: "text", text: " B ", style: undefined },
      { type: "value", values: null, style: undefined },
    ]);
  });

  it("treats trait rows as separate lines", () => {
    const lines = parseDescription("Intro<row>(@MinUnits@) Bonus</row><row>(@MinUnits@) More</row>");
    expect(lines).toHaveLength(3);
  });
});

describe("formatNumber", () => {
  it("rounds large values to integers and small values to two decimals", () => {
    expect(formatNumber(123.456)).toBe("123");
    expect(formatNumber(0.34999)).toBe("0.35");
    expect(formatNumber(5)).toBe("5");
  });
});

describe("parseDescription edge cases", () => {
  it("drops lines that only contain unresolvable values", () => {
    expect(parseDescription("Flavor<br><br>@TFTUnitProperty.:Key@")).toEqual([
      [{ type: "text", text: "Flavor", style: undefined }],
    ]);
  });
});

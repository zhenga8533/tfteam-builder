import { describe, expect, it } from "vitest";
import { hasCompFilters, parseCompFilters, passesCompFilters, tooManyCarries } from "./filters";

const comp = {
  name: "Blossom Ahri",
  units: [
    { apiName: "Ahri", carry: true },
    { apiName: "Sett", carry: false },
  ],
  traits: ["Blossom", "Spellweaver"],
};
const name = (apiName: string) => apiName;

describe("comp filters", () => {
  it("needs every picked champion and trait", () => {
    expect(passesCompFilters(comp, { champions: ["Ahri", "Sett"], traits: ["Blossom"] }, name)).toBe(true);
    expect(passesCompFilters(comp, { champions: ["Ahri", "Zyra"] }, name)).toBe(false);
    expect(passesCompFilters(comp, { traits: ["Blossom", "Brawler"] }, name)).toBe(false);
  });

  it("checks the carry role only for champions picked as carries", () => {
    expect(passesCompFilters(comp, { champions: ["Ahri", "Sett"], carries: ["Ahri"] }, name)).toBe(true);
    expect(passesCompFilters(comp, { champions: ["Sett"], carries: ["Sett"] }, name)).toBe(false);
  });

  it("matches the search against the comp's name or its champions", () => {
    expect(passesCompFilters(comp, { q: "blossom" }, name)).toBe(true);
    expect(passesCompFilters(comp, { q: "sett" }, name)).toBe(true);
    expect(passesCompFilters(comp, { q: "zyra" }, name)).toBe(false);
  });

  it("reads lists from the URL, keeping carries to picked champions", () => {
    expect(parseCompFilters({ champions: ["Ahri", "Sett"], carries: ["Ahri", "Zyra"], traits: ["Blossom"] })).toEqual({
      q: undefined,
      champions: ["Ahri", "Sett"],
      carries: ["Ahri"],
      traits: ["Blossom"],
    });
  });

  it("knows when filters are set and when carries can't all fit", () => {
    expect(hasCompFilters({})).toBe(false);
    expect(hasCompFilters({ traits: ["Blossom"] })).toBe(true);
    expect(tooManyCarries({ carries: ["A", "B"] })).toBe(false);
    expect(tooManyCarries({ carries: ["A", "B", "C"] })).toBe(true);
  });
});

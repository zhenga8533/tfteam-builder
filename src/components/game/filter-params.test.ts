import { describe, expect, it } from "vitest";
import type { Augment, Champion } from "@/lib/data/schema";
import {
  matchesAugmentFilters,
  matchesChampionFilters,
  parseAugmentFilters,
  parseChampionFilters,
} from "./filter-params";

const ahri = { name: "Ahri", cost: 4, traits: ["Blossom"] } as unknown as Champion;
const augment = { name: "Big Grab Bag", tier: 2 } as unknown as Augment;

describe("filter params", () => {
  it("reads champion filters from the URL and matches on all of them", () => {
    expect(parseChampionFilters({ q: "ah", cost: "4", trait: "Blossom" })).toEqual({
      q: "ah",
      cost: 4,
      trait: "Blossom",
    });
    expect(matchesChampionFilters(ahri, { q: "ah", cost: 4, trait: "Blossom" })).toBe(true);
    expect(matchesChampionFilters(ahri, { cost: 3 })).toBe(false);
    expect(matchesChampionFilters(ahri, { trait: "Brawler" })).toBe(false);
  });

  it("reads augment filters, dropping an invalid tier", () => {
    expect(parseAugmentFilters({ q: "bag", tier: "2" })).toEqual({ q: "bag", tier: 2 });
    expect(parseAugmentFilters({ tier: "7" }).tier).toBeUndefined();
    expect(matchesAugmentFilters(augment, { q: "grab", tier: 2 })).toBe(true);
    expect(matchesAugmentFilters(augment, { tier: 3 })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { renderReport, type SetReport } from "./report.ts";

const now = new Date("2026-10-04T12:00:00Z");
const set: SetReport = {
  set: 18,
  status: "ready",
  patch: "18.3b",
  rankFloor: "diamond",
  matches: 6618,
  updatedAt: "2026-10-04T06:00:00Z",
  comps: 34,
  floors: [{ floor: "master", matches: 2100, comps: 12 }],
  regions: [{ region: "americas", matches: 2500 }],
  boards: 1000,
  withRounds: 400,
  withCompanions: 400,
  unmapped: [],
};

describe("renderReport", () => {
  it("summarises each set and the largest files", () => {
    const markdown = renderReport({
      sets: [set],
      files: [
        { path: "set18.json", bytes: 300_000 },
        { path: "set18/explorer.bin.gz", bytes: 2_500_000 },
      ],
      now,
    });
    expect(markdown).toContain("### Set 18: ready, patch 18.3b, diamond+");
    expect(markdown).toContain("- **6,618 matches**, newest crawled 6 hours ago\n");
    expect(markdown).toContain("Knockout round on 40% of boards, Little Legends on 40%\n");
    expect(markdown).toContain("| master+ | 2,100 | 12 |");
    expect(markdown).toContain("| americas | 2,500 |");
    expect(markdown).toContain("### Files: 2, 2.8 MB");
    expect(markdown.indexOf("explorer.bin.gz")).toBeLessThan(markdown.indexOf("set18.json"));
    expect(markdown).toContain("| set18/explorer.bin.gz | 2.5 MB ⚠️ |");
  });

  it("flags stale data and missing fields, and lists unmapped names", () => {
    const markdown = renderReport({
      sets: [{ ...set, updatedAt: "2026-10-01T12:00:00Z", withRounds: 0, unmapped: ["items: DA_Potion (150)"] }],
      files: [],
      now,
    });
    expect(markdown).toContain("newest crawled 3 days ago ⚠️ no new matches lately");
    expect(markdown).toContain("⚠️ none yet, so those sections stay hidden");
    expect(markdown).toContain("Unmapped names, left out of the stats: items: DA_Potion (150)");
  });

  it("explains a skipped build", () => {
    expect(renderReport({ sets: [], files: [], now, skipped: "No R2 credentials." })).toBe(
      "## Match stats\n\n⚠️ No R2 credentials.\n",
    );
  });
});

import { describe, expect, it } from "vitest";
import { renderCrawlReport } from "./crawl-report.ts";

describe("renderCrawlReport", () => {
  const report = {
    minutesUsed: 44.6,
    budgetMinutes: 45,
    regions: [
      { region: "americas", players: 444, fetched: 1554, kept: 1229, byBucket: { master_plus: 500, diamond: 729 } },
      { region: "europe", error: "GET failed: 500" },
    ],
    pools: [{ platform: "na1", byBucket: { master_plus: 400, diamond: 350, emerald: 250 } }],
    newBoards: [["set 18 patch 18.3b", 43312]] as [string, number][],
  };

  it("summarises time, regions by tier, pools and new boards", () => {
    const markdown = renderCrawlReport(report);
    expect(markdown).toContain("Used 45 of 45 minutes.");
    expect(markdown).toContain("| Region | Players checked | Games fetched | Kept | Master+ | Diamond |");
    expect(markdown).toContain("| americas | 444 | 1,554 | 1,229 | 500 | 729 |");
    expect(markdown).toContain("| europe | ⚠️ failed: GET failed: 500 |");
    expect(markdown).toContain("| na1 | 400 | 350 | 250 |");
    expect(markdown).toContain("- set 18 patch 18.3b: 43,312 new boards");
  });

  it("puts patch timeline warnings first", () => {
    const markdown = renderCrawlReport({ ...report, patchWarnings: ["Patch 18.4's update has 12 balance changes."] });
    expect(markdown).toContain("## Crawl\n\n> [!WARNING]\n> Patch 18.4's update has 12 balance changes.\n");
    expect(renderCrawlReport(report)).not.toContain("[!WARNING]");
  });

  it("points out when the pools, not the key, are the limit", () => {
    expect(renderCrawlReport({ ...report, minutesUsed: 12 })).toContain(
      "Used 12 of 45 minutes, finishing early: larger player pools would collect more.",
    );
  });
});

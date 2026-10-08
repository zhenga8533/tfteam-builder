import { describe, expect, it } from "vitest";
import {
  articlesToRead,
  buildTimeline,
  mergeTimelines,
  midPatchText,
  nextData,
  parseMidPatches,
  parsePatchList,
  patchAt,
  patchReplacements,
  supersededPatches,
  switcherLabels,
  type PatchArticle,
  type TftPatch,
} from "./tft-patches.ts";

const page = (data: unknown) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;

const listing = {
  props: {
    blades: [
      {
        title: "Teamfight Tactics patch 18.3",
        publishedAt: "2026-09-22T18:00:00.000Z",
        action: { payload: { url: "/en-us/news/game-updates/teamfight-tactics-patch-18-3" } },
      },
      {
        title: "TFT Patch 18.3 Rundown",
        publishedAt: "2026-09-22T18:00:00.000Z",
        action: { payload: { url: "https://youtube.com/x" } },
      },
      {
        title: "Teamfight Tactics patch 18.2",
        publishedAt: "2026-09-09T18:00:00.000Z",
        action: { payload: { url: "/en-us/news/game-updates/teamfight-tactics-patch-18-2" } },
      },
    ],
  },
};

// Modelled on the 18.3 notes: a b patch on the 24th and a later hotfix that isn't a new patch.
const article = page({
  props: {
    body: "<h2>MID-PATCH UPDATE</h2><h4>SEPTEMBER 28TH</h4><p>We've temporarily disabled this until 18.4.</p><h4>SEPTEMBER 24TH</h4><p>Our 18.3 B patch responds to the meta. See you September 30.</p>",
  },
});

describe("TFT patch notes", () => {
  const articles = parsePatchList(nextData(page(listing)));

  it("finds patch notes articles, ignoring videos", () => {
    expect(articles.map((entry) => [entry.set, entry.minor, entry.url])).toEqual([
      [18, 3, "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-3"],
      [18, 2, "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-2"],
    ]);
  });

  it("reads b patches from dated mid-patch headings, treating later unnamed entries as hotfixes", () => {
    const mid = parseMidPatches(midPatchText(nextData(article)), articles[0]!);
    expect(mid).toEqual([{ letter: "b", since: Date.UTC(2026, 8, 24, 18) }]);
  });

  it("re-reads every article of the newest set, and at least the three newest", () => {
    const article = (set: number, minor: number): PatchArticle => ({
      set,
      minor,
      publishedAt: 0,
      url: `${set}.${minor}`,
    });
    const newestFirst = [
      article(18, 5),
      article(18, 4),
      article(18, 3),
      article(18, 2),
      article(18, 1),
      article(17, 8),
    ];
    expect(articlesToRead(newestFirst).map((entry) => entry.url)).toEqual(["18.5", "18.4", "18.3", "18.2", "18.1"]);
    // Early in a set, the last set's latest patches are still read.
    const newSet = [article(19, 1), article(18, 8), article(18, 7), article(18, 6)];
    expect(articlesToRead(newSet).map((entry) => entry.url)).toEqual(["19.1", "18.8", "18.7"]);
  });

  it("starts a new letter only when an update names it", () => {
    const text = "MID-PATCH UPDATE OCTOBER 2ND our 18.3 C patch OCTOBER 1ST first fixes";
    expect(parseMidPatches(text, articles[0]!).map((entry) => entry.letter)).toEqual(["b", "c"]);
  });

  it("builds a timeline and finds the patch live at a game's time", () => {
    const timeline = buildTimeline(articles, new Map([["18.3", [{ letter: "b", since: Date.UTC(2026, 8, 24, 18) }]]]));
    expect(timeline.map((entry) => entry.label)).toEqual(["18.2", "18.3", "18.3b"]);
    expect(patchAt(timeline, 18, Date.UTC(2026, 8, 23, 20))).toBe("18.3");
    expect(patchAt(timeline, 18, Date.UTC(2026, 8, 25))).toBe("18.3b");
    expect(patchAt(timeline, 18, Date.UTC(2026, 0, 1))).toBe("18.2");
    expect(patchAt(timeline, 19, Date.UTC(2026, 8, 25))).toBeNull();
    // A b patch's notes are in its patch's article.
    expect(timeline.find((entry) => entry.label === "18.3b")?.notes).toBe(articles[0]!.url);
  });

  it("finds patches replaced before they had any time live", () => {
    const day = (date: number) => Date.UTC(2026, 9, date, 18);
    const timeline: TftPatch[] = [
      { label: "18.3", set: 18, since: day(1) },
      { label: "18.3b", set: 18, since: day(2) },
      // A b patch dated the patch's release day.
      { label: "18.4", set: 18, since: day(7) },
      { label: "18.4b", set: 18, since: day(7) },
      { label: "19.1", set: 19, since: day(7) },
    ];
    expect([...supersededPatches(timeline)]).toEqual(["18.4"]);
    expect(patchReplacements(timeline)).toEqual(new Map([["18.4", "18.4b"]]));
    // A chain of same-day b patches resolves to the one that was live.
    const chain = [...timeline, { label: "18.4c", set: 18, since: day(7) }];
    expect(patchReplacements(chain)).toEqual(
      new Map([
        ["18.4", "18.4c"],
        ["18.4b", "18.4c"],
      ]),
    );
    expect(patchAt(timeline, 18, day(8))).toBe("18.4b");
  });

  it("keeps older patches that drop off the page, and labels the patch switcher", () => {
    const stored: TftPatch[] = [{ label: "18.1", set: 18, since: 1 }];
    const merged = mergeTimelines(stored, [{ label: "18.3b", set: 18, since: 5 }]);
    expect(merged.map((entry) => entry.label)).toEqual(["18.1", "18.3b"]);
    expect(switcherLabels(merged, 18, 18, 10)).toEqual({ latest: "18.3b", pbe: "18.4" });
    expect(switcherLabels(merged, 18, 19, 10)).toEqual({ latest: "18.3b", pbe: "19.1" });
  });
});

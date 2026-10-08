import { describe, expect, it } from "vitest";
import {
  articlesToRead,
  buildTimeline,
  mergeTimelines,
  midPatchSection,
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

const BALANCE = "<p>Mana: 30 ⇒ 20</p><p>Health: 500 ⇒ 550</p><p>Armor: 40 ⇒ 45</p>";

// Modelled on the 18.3 notes: a b patch on the 24th and a later bug fix that doesn't start a patch.
const article = page({
  props: {
    body:
      "<h2>MID-PATCH UPDATE</h2><h4>SEPTEMBER 28TH</h4><p>We've temporarily disabled this until 18.4.</p>" +
      `<h4>SEPTEMBER 24TH</h4><p>Our 18.3 B patch responds to the meta. See you September 30.</p>${BALANCE}` +
      `<h2>PATCH HIGHLIGHTS</h2><h4>SEPTEMBER 21ST</h4>${BALANCE}`,
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

  it("reads b patches from dated mid-patch headings, folding bug fixes and ignoring the main notes", () => {
    const mid = parseMidPatches(midPatchSection(nextData(article)), articles[0]!);
    expect(mid).toEqual([{ letter: "b", since: Date.UTC(2026, 8, 24, 18) }]);
  });

  it("counts every update toward the letter, as Riot does, but only starts a patch at balance changes", () => {
    // Modelled on the 18.1 notes: two bug fix updates, then "our third mid-patch update" with the balance changes.
    const notes = page({
      props: {
        body:
          `<h2>Mid-Patch Updates</h2><h3>AUGUST 31ST AND SEPTEMBER 1ST</h3>${BALANCE}` +
          "<h3>AUGUST 28TH</h3><h4>NEW FEATURE</h4><p>Faster loading.</p><h3>AUGUST 27TH</h3><p>Bug fixes.</p>" +
          `<h2>ENCHANTED WILDS RELEASE NOTES</h2>${BALANCE}`,
      },
    });
    const patch181: PatchArticle = { set: 18, minor: 1, publishedAt: Date.UTC(2026, 7, 25, 18), url: "18.1" };
    expect(parseMidPatches(midPatchSection(nextData(notes)), patch181)).toEqual([
      { letter: "d", since: Date.UTC(2026, 7, 31, 18) },
    ]);
  });

  it("uses the letter an update names over the count", () => {
    const notes = page({
      props: {
        body:
          `<h2>MID-PATCH UPDATE</h2><h4>OCTOBER 14TH</h4><p>Our 18.3 D patch.</p>${BALANCE}` +
          `<h4>OCTOBER 8TH</h4><p>The 18.3 B-Patch.</p>${BALANCE}`,
      },
    });
    expect(parseMidPatches(midPatchSection(nextData(notes)), articles[0]!).map((entry) => entry.letter)).toEqual([
      "b",
      "d",
    ]);
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

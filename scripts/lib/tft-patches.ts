/**
 * TFT's own patch names (18.3, 18.3b) and when each went live, read from Riot's official patch notes.
 * Neither CommunityDragon nor match data carries them: CDragon reports the client version (16.19) and
 * match data reports "TFT Unreal Version ?.?.?.?".
 */

const PATCH_LABEL = /^(\d+)\.(\d+)([a-z]?)$/;

/** Orders TFT patch labels: `18.3` < `18.3b` < `18.4` < `18.10`. */
export function comparePatches(a: string, b: string) {
  const [, aSet = "0", aMinor = "0", aLetter = ""] = a.match(PATCH_LABEL) ?? [];
  const [, bSet = "0", bMinor = "0", bLetter = ""] = b.match(PATCH_LABEL) ?? [];
  return Number(aSet) - Number(bSet) || Number(aMinor) - Number(bMinor) || aLetter.localeCompare(bLetter);
}

export interface TftPatch {
  /** e.g. "18.3" or "18.3b". */
  label: string;
  set: number;
  /** Epoch ms when the patch went live (approximate; regions roll out over a few hours). */
  since: number;
  /** Riot's patch notes article; a b patch's are in its patch's article. Absent on patches stored before it was kept. */
  notes?: string;
}

const NOTES_ORIGIN = "https://teamfighttactics.leagueoflegends.com";
const NOTES_LIST = `${NOTES_ORIGIN}/en-us/news/game-updates/`;
const PATCH_TITLE = /^Teamfight Tactics patch (\d+)\.(\d+)$/i;
/** Notes are published the day before a patch goes live. */
const RELEASE_DELAY_MS = 24 * 60 * 60 * 1000;
/** Mid-patch updates are dated by day; they usually land late morning in the Americas. */
const MID_PATCH_HOUR_UTC = 18;
/** Re-read at least this many of the newest articles, so a new set's first patch still covers the last set's latest. */
const MIN_ARTICLES_TO_READ = 3;

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
// A date in a mid-patch update's heading: "SEPTEMBER 24TH", "August 31st and September 1st" (the first counts).
const HEADING_DATE = new RegExp(`\\b(${MONTHS.join("|")}) (\\d{1,2})(?:ST|ND|RD|TH)?\\b`, "i");

export interface PatchArticle {
  set: number;
  minor: number;
  publishedAt: number;
  url: string;
}

/** The page data Riot's site (Next.js) embeds in every page. */
export function nextData(html: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Patch notes page has no embedded data; Riot's site layout may have changed");
  return JSON.parse(match[1]!);
}

/** Every "Teamfight Tactics patch X.Y" article in the page data, newest first. */
export function parsePatchList(data: unknown): PatchArticle[] {
  const articles = new Map<string, PatchArticle>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const entry = node as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title.match(PATCH_TITLE) : null;
    const url = (entry.action as { payload?: { url?: string } } | undefined)?.payload?.url;
    if (title && typeof entry.publishedAt === "string" && url) {
      const key = `${title[1]}.${title[2]}`;
      if (!articles.has(key)) {
        articles.set(key, {
          set: Number(title[1]),
          minor: Number(title[2]),
          publishedAt: Date.parse(entry.publishedAt),
          url: url.startsWith("http") ? url : `${NOTES_ORIGIN}${url}`,
        });
      }
    }
    for (const value of Object.values(entry)) walk(value);
  };
  walk(data);
  return [...articles.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}

const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The heading that opens an article's mid-patch updates, however it's capitalised ("Mid-Patch Updates"). */
const MID_PATCH_HEADING = /<h2[^>]*>(?:(?!<\/h2>)[\s\S])*mid-patch update(?:(?!<\/h2>)[\s\S])*<\/h2>/i;

/**
 * The HTML of an article's mid-patch section: its heading (which may carry the update's date, "17.3 MAY 13TH MID-PATCH
 * UPDATE") up to the next top-level heading. Empty without one.
 */
export function midPatchSection(data: unknown): string {
  const sections: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") {
      const heading = node.match(MID_PATCH_HEADING);
      if (!heading) return;
      const rest = node.slice(heading.index! + heading[0].length);
      const end = rest.search(/<h2[\s>]/i);
      sections.push(heading[0] + (end === -1 ? rest : rest.slice(0, end)));
    } else if (node && typeof node === "object") {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(data);
  return sections.join("");
}

/** A balance change in the notes: `Mana: 30/120 ⇒ 20/110`. */
const BALANCE_CHANGE = /⇒/g;
/** An update with at least this many balance changes changes the balance; fewer is bug and performance fixes. */
const MIN_BALANCE_CHANGES = 3;

/** The dated updates in a mid-patch section (each from a heading with its date), oldest first, with their text. */
function midPatchEntries(section: string, article: PatchArticle): { since: number; text: string }[] {
  const published = new Date(article.publishedAt);
  const headings = [...section.matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi)].flatMap((heading) => {
    const date = plainText(heading[1]!).match(HEADING_DATE);
    if (!date) return [];
    const month = MONTHS.indexOf(date[1]!.toUpperCase());
    // Notes published in December can have January updates.
    const year = published.getUTCFullYear() + (month < published.getUTCMonth() ? 1 : 0);
    return [{ index: heading.index!, since: Date.UTC(year, month, Number(date[2]), MID_PATCH_HOUR_UTC) }];
  });
  return headings
    .map((heading, i) => ({
      since: heading.since,
      text: plainText(section.slice(heading.index, headings[i + 1]?.index)),
    }))
    .sort((a, b) => a.since - b.since);
}

/** The patch letter an update names ("18.3 C patch", "18.4 B-Patch"), if any. */
function namedLetter(text: string, article: PatchArticle): string | undefined {
  const named = text.match(
    new RegExp(`\\b${article.set}\\.${article.minor}\\s*([b-z])\\b|\\b([b-z])[ -]patch\\b`, "i"),
  );
  return (named?.[1] ?? named?.[2])?.toLowerCase();
}

const nextLetter = (letter: string) => String.fromCharCode(letter.charCodeAt(0) + 1);

/**
 * Patches started by the mid-patch updates in a section, oldest first. Riot counts every update as the next letter
 * (18.1's third update is "18.1d") unless it names one. Only updates that change the balance start a patch; bug and
 * performance fixes stay part of the patch before, rather than splitting off a few days with nothing to compare.
 */
export function parseMidPatches(section: string, article: PatchArticle): { letter: string; since: number }[] {
  const patches: { letter: string; since: number }[] = [];
  let letter = "a";
  for (const entry of midPatchEntries(section, article)) {
    letter = namedLetter(entry.text, article) ?? nextLetter(letter);
    const changes = entry.text.match(BALANCE_CHANGE)?.length ?? 0;
    if (changes >= MIN_BALANCE_CHANGES) patches.push({ letter, since: entry.since });
  }
  return patches;
}

/**
 * Builds the timeline, oldest first, from the articles that were read (the keys of `midPatches`) and their mid-patch
 * updates. Articles not read are left to the stored timeline (see `mergeTimelines`).
 */
export function buildTimeline(articles: PatchArticle[], midPatches: Map<string, { letter: string; since: number }[]>) {
  const timeline: TftPatch[] = [];
  for (const article of articles) {
    const label = `${article.set}.${article.minor}`;
    if (!midPatches.has(label)) continue;
    const notes = article.url;
    timeline.push({ label, set: article.set, since: article.publishedAt + RELEASE_DELAY_MS, notes });
    for (const { letter, since } of midPatches.get(label) ?? []) {
      timeline.push({ label: `${label}${letter}`, set: article.set, since, notes });
    }
  }
  return timeline.sort((a, b) => a.since - b.since);
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "tfteam (+https://github.com/zhenga8533/tfteam)" },
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return nextData(await response.text());
}

/**
 * The articles to re-read for mid-patch updates, each a separate request: every patch of the newest set, since an
 * update can be added to any of its notes while the set is live, and at least the few newest overall. Older sets'
 * updates are kept from the stored timeline (see `mergeTimelines`).
 */
export function articlesToRead(articles: PatchArticle[]): PatchArticle[] {
  const newestSet = articles[0]?.set;
  return articles.filter((article, index) => index < MIN_ARTICLES_TO_READ || article.set === newestSet);
}

export async function fetchTftPatches(): Promise<TftPatch[]> {
  const articles = parsePatchList(await fetchPage(NOTES_LIST));
  if (articles.length === 0) throw new Error("No TFT patch notes found; Riot's site layout may have changed");
  const midPatches = new Map<string, { letter: string; since: number }[]>();
  for (const article of articlesToRead(articles)) {
    midPatches.set(
      `${article.set}.${article.minor}`,
      parseMidPatches(midPatchSection(await fetchPage(article.url)), article),
    );
  }
  return buildTimeline(articles, midPatches);
}

/**
 * Whether `time` is within `margin` ms of one of `set`'s patch changes. The notes give only a day for each change, so
 * games that close to one may belong to either side. A set's first patch isn't a change: matches report their set.
 */
export function nearPatchChange(timeline: TftPatch[], set: number, time: number, margin: number): boolean {
  const ofSet = timeline.filter((patch) => patch.set === set);
  // The set's release, by its first patch's label: the stored timeline may not reach back that far.
  const release = ofSet.find((patch) => patch.label === `${set}.1`)?.since ?? -Infinity;
  return ofSet.some((patch) => patch.since > release && Math.abs(time - patch.since) < margin);
}

/** The patch live at `time` for `set`, or null when the timeline has none for that set yet. */
export function patchAt(timeline: TftPatch[], set: number, time: number): string | null {
  const ofSet = timeline.filter((patch) => patch.set === set);
  return (ofSet.findLast((patch) => patch.since <= time) ?? ofSet[0])?.label ?? null;
}

/**
 * Patches a later one replaced before they had any time live, e.g. a patch whose b patch is dated its release day,
 * each with the patch that was live instead (the newest of those that replaced it). No game falls in a replaced patch:
 * what's filed under it is games the crawler labelled before the b patch was announced.
 */
export function patchReplacements(timeline: TftPatch[]): Map<string, string> {
  const replacements = new Map<string, string>();
  for (const patch of timeline) {
    const newest = timeline
      .filter(
        (other) =>
          other.set === patch.set && other.since <= patch.since && comparePatches(other.label, patch.label) > 0,
      )
      .map((other) => other.label)
      .sort(comparePatches)
      .at(-1);
    if (newest) replacements.set(patch.label, newest);
  }
  return replacements;
}

/** The patches `patchReplacements` finds replaced. */
export const supersededPatches = (timeline: TftPatch[]): Set<string> => new Set(patchReplacements(timeline).keys());

const familyOf = (label: string) => label.replace(/[a-z]$/, "");

/**
 * The stored timeline with each patch the fetch re-read replaced as a family (18.3 with its b, c, …), so a letter its
 * notes no longer support doesn't linger. Patches it didn't re-read, such as older sets', are kept as stored.
 */
export function mergeTimelines(stored: TftPatch[], fetched: TftPatch[]): TftPatch[] {
  const refreshed = new Set(fetched.map((patch) => familyOf(patch.label)));
  return [...stored.filter((patch) => !refreshed.has(familyOf(patch.label))), ...fetched].sort(
    (a, b) => a.since - b.since,
  );
}

/**
 * Labels for the site's patch switcher. Live is the newest patch of its set that has gone live; PBE is
 * the next patch, or the first patch of the next set when PBE already runs it.
 */
export function switcherLabels(timeline: TftPatch[], liveSet: number, pbeSet: number, now: number) {
  const live = timeline.filter((patch) => patch.set === liveSet && patch.since <= now).at(-1)?.label;
  if (!live) return null;
  const minor = Number(live.split(".")[1]!.replace(/[a-z]$/, ""));
  return { latest: live, pbe: pbeSet > liveSet ? `${pbeSet}.1` : `${liveSet}.${minor + 1}` };
}

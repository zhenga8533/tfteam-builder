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
// Section headings are uppercase ("SEPTEMBER 24TH"); prose mentions ("September 30") are not.
const DATED_HEADING = new RegExp(`\\b(${MONTHS.join("|")}) (\\d{1,2})(?:ST|ND|RD|TH)?\\b`, "g");

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

/** Plain text of every string in the page data that contains a mid-patch update section. */
export function midPatchText(data: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") {
      if (node.includes("MID-PATCH UPDATE")) parts.push(node.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    } else if (node && typeof node === "object") {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(data);
  return parts.join(" ");
}

/** Where an article's main notes start, after its mid-patch updates. */
const MAIN_NOTES = "PATCH HIGHLIGHTS";
/** A balance change in the notes: `Mana: 30/120 ⇒ 20/110`. */
const BALANCE_CHANGE = /⇒/g;
/** An update with at least this many balance changes is a real balance patch rather than a hotfix. */
const MIN_BALANCE_CHANGES = 3;

/** The dated updates in an article's mid-patch section, oldest first, each with its text. */
function midPatchEntries(text: string, article: PatchArticle): { since: number; text: string }[] {
  const start = text.indexOf("MID-PATCH UPDATE");
  if (start === -1) return [];
  const end = text.indexOf(MAIN_NOTES, start);
  const section = text.slice(start, end === -1 ? undefined : end);
  const published = new Date(article.publishedAt);
  const headings = [...section.matchAll(DATED_HEADING)].map((match) => {
    const month = MONTHS.indexOf(match[1]!);
    // Notes published in December can have January updates.
    const year = published.getUTCFullYear() + (month < published.getUTCMonth() ? 1 : 0);
    return { index: match.index, since: Date.UTC(year, month, Number(match[2]), MID_PATCH_HOUR_UTC) };
  });
  return headings
    .map((heading, i) => ({ since: heading.since, text: section.slice(heading.index, headings[i + 1]?.index) }))
    .sort((a, b) => a.since - b.since);
}

/** The patch letter an update names ("18.3 C patch", "18.4 B-Patch"), if any. */
function namedLetter(text: string, article: PatchArticle): string | undefined {
  const named = text.match(
    new RegExp(`\\b${article.set}\\.${article.minor}\\s*([b-z])\\b|\\b([b-z])[ -]patch\\b`, "i"),
  );
  return (named?.[1] ?? named?.[2])?.toLowerCase();
}

/**
 * Mid-patch ("b") updates listed in an article, oldest first. The first is the b patch; later entries
 * only start a new letter when they name one ("our 18.3 C patch"), otherwise they're hotfixes within it.
 */
export function parseMidPatches(text: string, article: PatchArticle): { letter: string; since: number }[] {
  const patches: { letter: string; since: number }[] = [];
  for (const entry of midPatchEntries(text, article)) {
    const letter = namedLetter(entry.text, article);
    if (patches.length === 0) patches.push({ letter: letter ?? "b", since: entry.since });
    else if (letter && letter > patches.at(-1)!.letter) patches.push({ letter, since: entry.since });
  }
  return patches;
}

/**
 * Later updates counted as hotfixes (they name no new letter) that still change the balance. Riot may have shipped
 * them as a new lettered patch without saying so, so the crawl flags them rather than guessing a letter.
 */
export function unnamedBalanceUpdates(text: string, article: PatchArticle): { since: number; changes: number }[] {
  return midPatchEntries(text, article).flatMap((entry, index) => {
    const changes = entry.text.match(BALANCE_CHANGE)?.length ?? 0;
    return index > 0 && !namedLetter(entry.text, article) && changes >= MIN_BALANCE_CHANGES
      ? [{ since: entry.since, changes }]
      : [];
  });
}

/** Builds the timeline, oldest first, from the article list and the newest articles' mid-patch updates. */
export function buildTimeline(articles: PatchArticle[], midPatches: Map<string, { letter: string; since: number }[]>) {
  const timeline: TftPatch[] = [];
  for (const article of articles) {
    const label = `${article.set}.${article.minor}`;
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

/**
 * The patch timeline from Riot's notes, and warnings about mid-patch updates it may have counted wrong (see
 * `unnamedBalanceUpdates`).
 */
export async function fetchTftPatches(): Promise<{ timeline: TftPatch[]; warnings: string[] }> {
  const articles = parsePatchList(await fetchPage(NOTES_LIST));
  if (articles.length === 0) throw new Error("No TFT patch notes found; Riot's site layout may have changed");
  const midPatches = new Map<string, { letter: string; since: number }[]>();
  const warnings: string[] = [];
  for (const article of articlesToRead(articles)) {
    const label = `${article.set}.${article.minor}`;
    const text = midPatchText(await fetchPage(article.url));
    const patches = parseMidPatches(text, article);
    midPatches.set(label, patches);
    for (const { since, changes } of unnamedBalanceUpdates(text, article)) {
      const counted = patches.findLast((patch) => patch.since <= since);
      warnings.push(
        `Patch ${label}'s update of ${new Date(since).toISOString().slice(0, 10)} has ${changes} balance changes but ` +
          `names no patch letter, so it's counted as part of ${label}${counted?.letter ?? ""}.`,
      );
    }
  }
  return { timeline: buildTimeline(articles, midPatches), warnings };
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

/** Keeps patches from the stored timeline that a fresh fetch no longer lists (older articles drop off). */
export function mergeTimelines(stored: TftPatch[], fetched: TftPatch[]): TftPatch[] {
  const byLabel = new Map(stored.map((patch) => [patch.label, patch]));
  for (const patch of fetched) byLabel.set(patch.label, patch);
  return [...byLabel.values()].sort((a, b) => a.since - b.since);
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

/** What one set's stats build produced, for the deploy summary. */
export interface SetReport {
  set: number;
  status: string;
  patch: string;
  rankFloor: string;
  matches: number;
  /** When the newest stored boards were crawled (ISO). */
  updatedAt: string;
  /** Detected comps at the default floor. */
  comps: number;
  floors: { floor: string; matches: number; comps: number }[];
  regions: { region: string; matches: number }[];
  /** Boards in the published sample, and how many carry the later-added fields. */
  boards: number;
  withRounds: number;
  withCompanions: number;
  /** Game names the stats couldn't map to game data, with how often they appeared. */
  unmapped: string[];
}

export interface FileSize {
  path: string;
  bytes: number;
}

interface Report {
  sets: SetReport[];
  files: FileSize[];
  now: Date;
  /** Why no stats were built, when none were. */
  skipped?: string;
}

/** Data older than this suggests crawling has stopped. */
const STALE_HOURS = 24;
/** Files the browser downloads whole; past this they're worth a look. */
const LARGE_FILE_BYTES = 2_000_000;
const LARGEST_SHOWN = 5;
/** The Explorer's files download only there (a champion's when they're picked), so they get more room. */
const LARGE_EXPLORER_FILE_BYTES = 10_000_000;
const EXPLORER_SAMPLE = /(^|\/)explorer\.bin\.gz$/;
const EXPLORER_CHAMPION = /(^|\/)explorer\//;

const count = (value: number) => value.toLocaleString("en-US");
const percent = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "–");
const size = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;

function age(updatedAt: string, now: Date) {
  const hours = (now.getTime() - new Date(updatedAt).getTime()) / 3_600_000;
  const text = hours < 48 ? `${Math.round(hours)} hours ago` : `${Math.round(hours / 24)} days ago`;
  return { text, stale: hours > STALE_HOURS };
}

const explorerSize = (file: FileSize) => `${size(file.bytes)}${file.bytes > LARGE_EXPLORER_FILE_BYTES ? " ⚠️" : ""}`;

/** The Explorer's sample and champion files in one line, with the largest champion file. */
function explorerSummary(files: FileSize[]) {
  const sample = files.find((file) => EXPLORER_SAMPLE.test(file.path));
  const champions = files.filter((file) => EXPLORER_CHAMPION.test(file.path));
  if (!sample && champions.length === 0) return null;
  const parts = sample ? [`sample ${explorerSize(sample)}`] : [];
  if (champions.length) {
    const largest = champions.reduce((a, b) => (b.bytes > a.bytes ? b : a));
    const all = champions.reduce((sum, file) => sum + file.bytes, 0);
    parts.push(
      `${count(champions.length)} champion files, ${size(all)} in all, largest ${explorerSize(largest)} (${largest.path})`,
    );
  }
  return `**Explorer:** ${parts.join("; ")}`;
}

/**
 * The stats build's summary as Markdown, with ⚠️ on anything that needs a look. Unmapped names aren't flagged:
 * some (e.g. consumables) never map, so they'd be noise on every deploy.
 */
export function renderReport({ sets, files, now, skipped }: Report): string {
  const lines = ["## Match stats"];
  if (skipped) return [...lines, "", `⚠️ ${skipped}`, ""].join("\n");

  for (const report of sets) {
    const { text, stale } = age(report.updatedAt, now);
    lines.push(
      "",
      `### Set ${report.set}: ${report.status}, patch ${report.patch}, ${report.rankFloor}+`,
      "",
      `- **${count(report.matches)} matches**, newest crawled ${text}` +
        (stale ? " ⚠️ no new matches lately; is crawling enabled (`CRAWL_ENABLED`)?" : ""),
      `- **${count(report.comps)} comps** detected`,
      `- Knockout round on ${percent(report.withRounds, report.boards)} of boards, Little Legends on ${percent(report.withCompanions, report.boards)}` +
        (report.boards && !report.withRounds ? " ⚠️ none yet, so those sections stay hidden" : ""),
    );
    if (report.floors.length) {
      lines.push("", "| Rank floor | Matches | Comps |", "| --- | ---: | ---: |");
      for (const floor of report.floors) lines.push(`| ${floor.floor}+ | ${count(floor.matches)} | ${floor.comps} |`);
    }
    if (report.regions.length) {
      lines.push("", "| Region | Matches |", "| --- | ---: |");
      for (const region of report.regions) lines.push(`| ${region.region} | ${count(region.matches)} |`);
    }
    if (report.unmapped.length) lines.push("", `Unmapped names, left out of the stats: ${report.unmapped.join("; ")}`);
  }

  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const isExplorer = (file: FileSize) => EXPLORER_SAMPLE.test(file.path) || EXPLORER_CHAMPION.test(file.path);
  const largest = files
    .filter((file) => !isExplorer(file))
    .toSorted((a, b) => b.bytes - a.bytes)
    .slice(0, LARGEST_SHOWN);
  lines.push("", `### Files: ${count(files.length)}, ${size(total)}`, "", "| File | Size |", "| --- | ---: |");
  for (const file of largest) {
    lines.push(`| ${file.path} | ${size(file.bytes)}${file.bytes > LARGE_FILE_BYTES ? " ⚠️" : ""} |`);
  }
  const explorer = explorerSummary(files);
  if (explorer) lines.push("", explorer);
  return [...lines, ""].join("\n");
}

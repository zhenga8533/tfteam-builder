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
  /** Boards in the published sample, and how many report a knockout round and a Little Legend. */
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
const EXPLORER = /(^|\/)explorer\//;

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

/** The Explorer's files in one line: each kind's count, total and largest (see `EXPLORER_FILES`). */
function explorerSummary(files: FileSize[]) {
  const explorer = files.filter((file) => EXPLORER.test(file.path));
  if (explorer.length === 0) return null;
  const kind = (label: string, folder: string) => {
    const matching = explorer.filter((file) => file.path.includes(`/explorer/${folder}/`));
    if (matching.length === 0) return [];
    const largest = matching.reduce((a, b) => (b.bytes > a.bytes ? b : a));
    const all = matching.reduce((sum, file) => sum + file.bytes, 0);
    return [
      `${count(matching.length)} ${label} file${matching.length === 1 ? "" : "s"}, ${size(all)} in all, largest ${explorerSize(largest)} (${largest.path})`,
    ];
  };
  const single = (label: string, name: string) => {
    const file = explorer.find((entry) => entry.path.endsWith(`/explorer/${name}`));
    return file ? [`${label} ${explorerSize(file)}`] : [];
  };
  const parts = [
    ...kind("champion", "champions"),
    ...kind("trait", "traits"),
    ...single("totals", "totals.json"),
    ...single("sample", "sample.bin.gz"),
  ];
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
        (report.boards && !report.withRounds ? " ⚠️ none, so those sections stay hidden" : ""),
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
  const largest = files
    .filter((file) => !EXPLORER.test(file.path))
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

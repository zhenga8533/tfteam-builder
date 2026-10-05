import { appendFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import {
  type AutoComp,
  autoCompsSchema,
  championStatsSchema,
  itemStatsSchema,
  littleLegendsSchema,
  patchHistorySchema,
  type Manifest,
  type RankFloor,
  type SetData,
  type SetStats,
  setStatsSchema,
  traitStatsSchema,
} from "../src/lib/data/schema.ts";
import { encodeExplorer, type ExplorerBoard } from "../src/lib/explorer/format.ts";
import { BoardResolver, type ResolvedBoard } from "./lib/boards.ts";
import { ChampionAccumulator } from "./lib/champion-stats.ts";
import { CompDetector } from "./lib/comps.ts";
import { DatabaseAccumulator } from "./lib/database-stats.ts";
import { compTrends, patchHistory, patchTrend } from "./lib/trends.ts";
import { FormInference } from "./lib/forms.ts";
import { fetchCompanions, LittleLegendAccumulator } from "./lib/little-legends.ts";
import { type FileSize, renderReport, type SetReport } from "./lib/report.ts";
import { RANK_OPTIONS, REGIONS } from "../src/lib/data/constants.ts";
import {
  buildFloorStats,
  buildRegionStats,
  buildSetStats,
  distinctFloors,
  explorerQuotas,
  FLOOR_BUCKETS,
} from "./lib/stats.ts";
import { addBoardToPatch } from "./stats/aggregate.ts";
import { CachingBlobStore } from "./stats/blob.ts";
import { type BoardChunk, comparePatches, createStatsStore, StatsStore } from "./stats/state.ts";
import { type BoardRow, type PatchCounters, RANK_BUCKETS } from "./stats/types.ts";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const OUT_DIR = join(DATA_DIR, "stats");
/** The site shows the newest patch, falling back to the previous one right after a patch. */
const PATCHES_PER_SET = 2;
/** Boards in the Explorer's sample, newest first; larger samples mean a bigger download. */
const EXPLORER_SAMPLE = 150_000;

const { values: args } = parseArgs({ options: { stats: { type: "string" } } });

const readJson = async <T>(path: string) => JSON.parse(await readFile(path, "utf8")) as T;

const top = (names: Map<string, number>) =>
  [...names]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, games]) => `${name} (${games})`)
    .join(", ");

/** `20261001T120000Z-americas` → `2026-10-01T12:00:00Z` */
const chunkTime = (name: string) =>
  name.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z.*$/, "$1-$2-$3T$4:$5:$6Z");

type ReadBoards = (chunk: BoardChunk) => Promise<BoardRow[]>;

/** Streams a patch's chunks one at a time, so memory holds counters rather than every board. */
async function loadPatch(read: ReadBoards, set: number, patch: string, chunks: BoardChunk[]): Promise<PatchCounters> {
  const counters: PatchCounters = { set, patch, updatedAt: "", buckets: {} };
  for (const chunk of chunks) {
    for (const row of await read(chunk)) addBoardToPatch(counters, row);
    const time = chunkTime(chunk.name);
    if (time > counters.updatedAt) counters.updatedAt = time;
  }
  return counters;
}

/** A pass over the boards behind the published stats (chosen patch and rank floor). */
type EachBoard = (visit: (board: ResolvedBoard) => void) => Promise<void>;

/** Visits the boards behind `stats` (its patch and rank floor), re-reading chunks for each pass. */
function boardsOf(read: ReadBoards, data: SetData, stats: SetStats, chunks: BoardChunk[]): EachBoard {
  const buckets = new Set(FLOOR_BUCKETS[stats.rankFloor]);
  const resolver = new BoardResolver(data);
  const sample = chunks.filter((chunk) => chunk.patch === stats.patch);
  return async (visit) => {
    for (const chunk of sample) {
      for (const row of await read(chunk)) if (buckets.has(row[2])) visit(resolver.board(row));
    }
  };
}

/** Comps detected on another rank floor's boards, for the comp tier list's rank choice. */
async function detectComps(eachBoard: EachBoard, data: SetData) {
  const comps = new CompDetector(data);
  await eachBoard((board) => comps.count(board));
  await eachBoard((board) => comps.add(board));
  return comps.results();
}

/**
 * Adds each comp's change since the previous patch's saved comps and saves these for the next patch.
 * Returns what `comps.json` holds.
 */
async function withCompTrends(store: StatsStore, stats: SetStats, comps: AutoComp[], floor?: RankFloor) {
  const previous = await store.previousComps(stats.set, stats.patch, floor);
  const file = autoCompsSchema.parse({
    comps: previous ? compTrends(comps, previous.comps) : comps,
    ...(previous && { trendPatch: previous.patch }),
  });
  await store.putComps(stats.set, stats.patch, JSON.stringify({ comps }), floor);
  return file;
}

/** One JSON file per entry, named by its apiName, for the detail pages. */
async function writeEntryFiles<T extends { apiName: string }>(dir: string, entries: T[], parse: (entry: T) => T) {
  await mkdir(dir, { recursive: true });
  for (const entry of entries) await writeFile(join(dir, `${entry.apiName}.json`), JSON.stringify(parse(entry)));
}

/** Only boards crawled since rows recorded companions have them; the page explains when there are none yet. */
async function writeLittleLegends(dir: string, legends: LittleLegendAccumulator) {
  if (!legends.size) return;
  try {
    const file = littleLegendsSchema.parse({ legends: legends.results(await fetchCompanions()) });
    await writeFile(join(dir, "little-legends.json"), JSON.stringify(file));
    console.log(`  ${file.legends.length} Little Legends`);
  } catch (error) {
    // Cosmetic stats shouldn't hold back the rest of the site's data.
    console.warn(`  Skipped Little Legends: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * The newest boards of each rank behind `stats` and the other offered rank floors, in the patch's rank mix (see
 * `explorerQuotas`). Each is packed with its rank, so the Explorer can show any offered floor (the default by default).
 */
async function writeExplorerSample(
  dir: string,
  read: ReadBoards,
  data: SetData,
  stats: SetStats,
  patches: PatchCounters[],
  chunks: BoardChunk[],
) {
  // Ready stats are always from one of the loaded patches.
  const patch = patches.find((entry) => entry.patch === stats.patch)!;
  const offered = [stats.rankFloor, ...(stats.ranks ?? [])];
  const lowest = RANK_OPTIONS.findLast((floor) => offered.includes(floor)) ?? stats.rankFloor;
  const quotas = explorerQuotas(patch, lowest, EXPLORER_SAMPLE);
  const resolver = new BoardResolver(data);
  const newestFirst = chunks
    .filter((chunk) => chunk.patch === stats.patch)
    .sort((a, b) => b.name.localeCompare(a.name));
  const explorer: ExplorerBoard[] = [];
  const full = () => [...quotas.values()].every((left) => left <= 0);
  for (const chunk of newestFirst) {
    for (const row of await read(chunk)) {
      const left = quotas.get(row[2]) ?? 0;
      if (left <= 0) continue;
      quotas.set(row[2], left - 1);
      explorer.push({ ...resolver.board(row), rank: RANK_BUCKETS.indexOf(row[2]) });
    }
    if (full()) break;
  }
  const encoded = gzipSync(encodeExplorer(explorer, RANK_OPTIONS.indexOf(stats.rankFloor)), { level: 9 });
  await writeFile(join(dir, "explorer.bin.gz"), encoded);
  console.log(`  explorer sample: ${explorer.length} boards, ${(encoded.byteLength / 1e6).toFixed(1)} MB`);
}

/**
 * Everything beyond the tier list stats: detail pages, comps, Little Legends and the Explorer sample. Returns
 * figures for the deploy summary.
 */
async function writeDetails(
  store: StatsStore,
  read: ReadBoards,
  data: SetData,
  stats: SetStats,
  patches: PatchCounters[],
  chunks: BoardChunk[],
) {
  const dir = join(OUT_DIR, `set${data.number}`);
  await rm(dir, { recursive: true, force: true });
  const figures = { comps: 0, boards: 0, withRounds: 0, withCompanions: 0 };
  if (stats.status !== "ready") return figures;

  // One pass feeds every accumulator; comps need a second to collect details for the signatures that qualify.
  const eachBoard = boardsOf(read, data, stats, chunks);
  const champions = new ChampionAccumulator();
  const database = new DatabaseAccumulator();
  const comps = new CompDetector(data);
  const legends = new LittleLegendAccumulator();
  await eachBoard((board) => {
    champions.add(board);
    database.add(board);
    comps.count(board);
    legends.add(board);
    figures.boards += 1;
    if (board.lastRound !== undefined) figures.withRounds += 1;
    if (board.companion) figures.withCompanions += 1;
  });
  await eachBoard((board) => comps.add(board));
  const detected = comps.results();

  const championStats = champions.results();
  const byChampion = new Map(championStats.map((champion) => [champion.apiName, champion]));
  for (const comp of detected) {
    for (const unit of comp.units) byChampion.get(unit.apiName)?.comps.push(comp.id);
  }
  const { items, traits } = database.results(championStats, detected);
  await writeEntryFiles(join(dir, "champions"), championStats, (entry) => championStatsSchema.parse(entry));
  await writeEntryFiles(join(dir, "items"), items, (entry) => itemStatsSchema.parse(entry));
  await writeEntryFiles(join(dir, "traits"), traits, (entry) => traitStatsSchema.parse(entry));
  await writeFile(join(dir, "comps.json"), JSON.stringify(await withCompTrends(store, stats, detected)));
  console.log(
    `  ${championStats.length} champion, ${items.length} item and ${traits.length} trait files, ${detected.length} comps`,
  );

  await writeLittleLegends(dir, legends);
  await writeExplorerSample(dir, read, data, stats, patches, chunks);
  return { ...figures, comps: detected.length };
}

/** Every published stats file with its size, for the deploy summary. */
async function statsFiles(): Promise<FileSize[]> {
  const entries = await readdir(OUT_DIR, { recursive: true, withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name);
        return { path: relative(OUT_DIR, path).split(sep).join("/"), bytes: (await stat(path)).size };
      }),
  );
}

/** Adds the summary to the GitHub Actions run page when running there. */
async function publishReport(markdown: string) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
}

/**
 * A set whose boards are gone (e.g. deleted to save storage) still publishes its last saved stats and
 * history; per-champion details need the boards, so those pages show no details.
 */
async function publishSavedSummary(store: StatsStore, set: number) {
  const summaries = await store.summaries(set);
  const last = summaries.filter((summary) => summary.status === "ready").at(-1);
  if (!last) return;
  await writeFile(join(OUT_DIR, `set${set}.json`), JSON.stringify(setStatsSchema.parse(last)));
  await rm(join(OUT_DIR, `set${set}`), { recursive: true, force: true });
  await mkdir(join(OUT_DIR, `set${set}`), { recursive: true });
  await writeFile(
    join(OUT_DIR, `set${set}`, "history.json"),
    JSON.stringify(patchHistorySchema.parse(patchHistory(summaries))),
  );
  console.log(`set ${set}: saved summary from patch ${last.patch} (no stored boards)`);
}

/** Other rank floors that get their own tier list stats: those with enough games that differ meaningfully. */
function floorStatsFor(data: SetData, patches: PatchCounters[], stats: SetStats): SetStats[] {
  const floors = RANK_OPTIONS.map((floor) =>
    floor === stats.rankFloor ? stats : buildFloorStats(data, patches, floor),
  );
  return distinctFloors(floors, RANK_OPTIONS.indexOf(stats.rankFloor)).filter((floor) => floor !== stats);
}

/** Tier list stats for each region with boards, at the same patch and rank floor as `stats`. */
async function regionStatsFor(read: ReadBoards, data: SetData, stats: SetStats, patchChunks: BoardChunk[]) {
  const regions: SetStats[] = [];
  for (const region of REGIONS) {
    const regionChunks = patchChunks.filter((chunk) => chunk.name.endsWith(`-${region}`));
    if (regionChunks.length === 0) continue;
    const regional = await loadPatch(read, stats.set, stats.patch, regionChunks);
    const entry = buildRegionStats(data, regional, stats, region);
    if (entry) regions.push(entry);
  }
  return regions;
}

/** Saves each floor's summary, with its trend since the previous patch, so later patches can compare. */
async function saveFloorSummaries(store: StatsStore, set: number, floorStats: SetStats[]) {
  for (const entry of floorStats) {
    const floorTrend = patchTrend(
      entry,
      (await store.summaries(set, entry.rankFloor)).filter((summary) => summary.patch !== entry.patch),
    );
    if (floorTrend) entry.trend = floorTrend;
    await store.putSummary(set, entry.patch, JSON.stringify(setStatsSchema.parse(entry)), entry.rankFloor);
  }
}

async function writeRegionFiles(set: number, regionStats: SetStats[]) {
  if (regionStats.length === 0) return;
  await mkdir(join(OUT_DIR, `set${set}`, "regions"), { recursive: true });
  for (const entry of regionStats) {
    await writeFile(
      join(OUT_DIR, `set${set}`, "regions", `${entry.region}.json`),
      JSON.stringify(setStatsSchema.parse(entry)),
    );
  }
}

/** Each floor's tier list stats and detected comps; returns the figures for the deploy summary. */
async function writeFloorFiles(
  store: StatsStore,
  read: ReadBoards,
  data: SetData,
  floorStats: SetStats[],
  setChunks: BoardChunk[],
): Promise<SetReport["floors"]> {
  if (floorStats.length === 0) return [];
  const set = data.number;
  await mkdir(join(OUT_DIR, `set${set}`, "ranks"), { recursive: true });
  const floors: SetReport["floors"] = [];
  for (const entry of floorStats) {
    await writeFile(
      join(OUT_DIR, `set${set}`, "ranks", `${entry.rankFloor}.json`),
      JSON.stringify(setStatsSchema.parse(entry)),
    );
    const floorComps = await detectComps(boardsOf(read, data, entry, setChunks), data);
    await writeFile(
      join(OUT_DIR, `set${set}`, "ranks", `${entry.rankFloor}.comps.json`),
      JSON.stringify(await withCompTrends(store, entry, floorComps, entry.rankFloor)),
    );
    console.log(`  ${entry.rankFloor}+: ${floorComps.length} comps`);
    floors.push({ floor: entry.rankFloor, matches: entry.matches, comps: floorComps.length });
  }
  return floors;
}

/**
 * Builds and writes one set's stats from its newest patches' boards. A set whose boards are gone publishes its
 * saved summary instead, and has nothing to report.
 */
async function buildSet(store: StatsStore, chunks: BoardChunk[], set: number): Promise<SetReport | undefined> {
  const setChunks = chunks.filter((chunk) => chunk.set === set);
  const byPatch = Map.groupBy(setChunks, (chunk) => chunk.patch);
  const newest = [...byPatch.keys()].sort((a, b) => comparePatches(b, a)).slice(0, PATCHES_PER_SET);
  if (newest.length === 0) {
    await publishSavedSummary(store, set);
    return undefined;
  }

  const data = await readJson<SetData>(join(DATA_DIR, "latest", `set${set}.json`));
  const forms = new FormInference(data);
  const read: ReadBoards = async (chunk) => (await store.readBoards(chunk)).map((row) => forms.row(row));
  const patches = await Promise.all(newest.map((patch) => loadPatch(read, set, patch, byPatch.get(patch)!)));
  const { stats, unknown } = buildSetStats(data, patches);
  const summaries = (await store.summaries(set)).filter((summary) => summary.patch !== stats.patch);
  const trend = patchTrend(stats, summaries);
  if (trend) stats.trend = trend;

  // Tier lists can switch to another rank floor, or narrow to one region at the default floor.
  const ready = stats.status === "ready";
  const floorStats = ready ? floorStatsFor(data, patches, stats) : [];
  const regionStats = ready ? await regionStatsFor(read, data, stats, byPatch.get(stats.patch) ?? []) : [];
  if (floorStats.length) stats.ranks = floorStats.map((entry) => entry.rankFloor);
  if (regionStats.length) stats.regions = regionStats.map((entry) => entry.region!);
  await saveFloorSummaries(store, set, floorStats);

  const json = JSON.stringify(setStatsSchema.parse(stats));
  await writeFile(join(OUT_DIR, `set${set}.json`), json);
  if (ready) await store.putSummary(set, stats.patch, json);
  // Clears and rewrites the set's folder, so the region and floor files are written after it.
  const figures = await writeDetails(store, read, data, stats, patches, setChunks);
  await writeRegionFiles(set, regionStats);
  const floors = await writeFloorFiles(store, read, data, floorStats, setChunks);
  if (ready) {
    const history = patchHistory([...summaries, stats]);
    await writeFile(join(OUT_DIR, `set${set}`, "history.json"), JSON.stringify(patchHistorySchema.parse(history)));
  }

  console.log(
    `set ${set}: ${stats.status}, patch ${stats.patch}, ${stats.rankFloor}+, ${stats.matches} matches` +
      (stats.previousPatch ? " (previous patch)" : ""),
  );
  for (const [kind, names] of Object.entries(unknown)) {
    if (names.size) console.warn(`  unmapped ${kind}: ${top(names)}`);
  }
  return {
    set,
    status: stats.status,
    patch: stats.patch,
    rankFloor: stats.rankFloor,
    matches: stats.matches,
    updatedAt: stats.updatedAt,
    floors,
    regions: regionStats.map((entry) => ({ region: entry.region!, matches: entry.matches })),
    unmapped: Object.entries(unknown).flatMap(([kind, names]) => (names.size ? [`${kind}: ${top(names)}`] : [])),
    ...figures,
  };
}

async function main() {
  const source = createStatsStore(args.stats);
  if (!source) {
    console.log("No R2 credentials or --stats directory; skipping stats.");
    await publishReport(
      renderReport({
        sets: [],
        files: [],
        now: new Date(),
        skipped: "No R2 credentials, so no match stats were built.",
      }),
    );
    return;
  }
  // Each set's boards are read in several passes (counters, champion and comp details, the Explorer sample).
  const store = new StatsStore(new CachingBlobStore(source.blobs, "boards/"));
  const chunks = await store.listBoardChunks();

  // Stats describe live ranked games, so they're built against live-patch game data only.
  const manifest = await readJson<Manifest>(join(DATA_DIR, "manifest.json"));
  await mkdir(OUT_DIR, { recursive: true });

  const reports: SetReport[] = [];
  for (const set of manifest.patches.latest.sets) {
    const report = await buildSet(store, chunks, set);
    if (report) reports.push(report);
  }
  await publishReport(renderReport({ sets: reports, files: await statsFiles(), now: new Date() }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

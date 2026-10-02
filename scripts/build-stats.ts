import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import {
  autoCompsSchema,
  championStatsSchema,
  itemStatsSchema,
  patchHistorySchema,
  type Manifest,
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
import { patchHistory, patchTrend } from "./lib/trends.ts";
import { FormInference } from "./lib/forms.ts";
import { RANK_OPTIONS } from "../src/lib/data/constants.ts";
import { buildFloorStats, buildSetStats, FLOOR_BUCKETS } from "./lib/stats.ts";
import { addBoardToPatch } from "./stats/aggregate.ts";
import { CachingBlobStore } from "./stats/blob.ts";
import { type BoardChunk, comparePatches, createStatsStore, StatsStore } from "./stats/state.ts";
import type { BoardRow, PatchCounters } from "./stats/types.ts";

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

/**
 * Second pass over the boards behind the published stats (chosen patch and rank floor), for the
 * per-champion detail files.
 */
async function writeDetails(read: ReadBoards, data: SetData, stats: SetStats, chunks: BoardChunk[]) {
  const dir = join(OUT_DIR, `set${data.number}`);
  await rm(dir, { recursive: true, force: true });
  if (stats.status !== "ready") return;

  const buckets = new Set(FLOOR_BUCKETS[stats.rankFloor]);
  const resolver = new BoardResolver(data);
  const sample = chunks.filter((chunk) => chunk.patch === stats.patch);
  /** Re-reads the sample instead of holding every board in memory between passes. */
  const eachBoard = async (visit: (board: ResolvedBoard) => void) => {
    for (const chunk of sample) {
      for (const row of await read(chunk)) if (buckets.has(row[2])) visit(resolver.board(row));
    }
  };

  const champions = new ChampionAccumulator();
  const database = new DatabaseAccumulator();
  const comps = new CompDetector(data);
  await eachBoard((board) => {
    champions.add(board);
    database.add(board);
    comps.count(board);
  });
  await eachBoard((board) => comps.add(board));
  const detected = comps.results();

  const championStats = champions.results();
  const byChampion = new Map(championStats.map((champion) => [champion.apiName, champion]));
  for (const comp of detected) {
    for (const unit of comp.units) byChampion.get(unit.apiName)?.comps.push(comp.id);
  }

  const writeAll = async <T extends { apiName: string }>(folder: string, entries: T[], parse: (entry: T) => T) => {
    await mkdir(join(dir, folder), { recursive: true });
    for (const entry of entries) {
      await writeFile(join(dir, folder, `${entry.apiName}.json`), JSON.stringify(parse(entry)));
    }
  };
  const { items, traits } = database.results(championStats, detected);
  await writeAll("champions", championStats, (entry) => championStatsSchema.parse(entry));
  await writeAll("items", items, (entry) => itemStatsSchema.parse(entry));
  await writeAll("traits", traits, (entry) => traitStatsSchema.parse(entry));
  await writeFile(join(dir, "comps.json"), JSON.stringify(autoCompsSchema.parse({ comps: detected })));

  const explorer: ExplorerBoard[] = [];
  for (const chunk of [...sample].sort((a, b) => b.name.localeCompare(a.name))) {
    for (const row of await read(chunk)) {
      if (explorer.length >= EXPLORER_SAMPLE) break;
      if (buckets.has(row[2])) explorer.push(resolver.board(row));
    }
    if (explorer.length >= EXPLORER_SAMPLE) break;
  }
  const encoded = gzipSync(encodeExplorer(explorer), { level: 9 });
  await writeFile(join(dir, "explorer.bin.gz"), encoded);
  console.log(`  explorer sample: ${explorer.length} boards, ${(encoded.byteLength / 1e6).toFixed(1)} MB`);
  console.log(
    `  ${championStats.length} champion, ${items.length} item and ${traits.length} trait files, ${detected.length} comps`,
  );
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

async function main() {
  const source = createStatsStore(args.stats);
  if (!source) {
    console.log("No R2 credentials or --stats directory; skipping stats.");
    return;
  }
  // Each set's boards are read in several passes (counters, champion and comp details, the Explorer sample).
  const store = new StatsStore(new CachingBlobStore(source.blobs, "boards/"));
  const chunks = await store.listBoardChunks();

  // Stats describe live ranked games, so they're built against live-patch game data only.
  const manifest = await readJson<Manifest>(join(DATA_DIR, "manifest.json"));
  await mkdir(OUT_DIR, { recursive: true });

  for (const set of manifest.patches.latest.sets) {
    const byPatch = Map.groupBy(
      chunks.filter((chunk) => chunk.set === set),
      (chunk) => chunk.patch,
    );
    const newest = [...byPatch.keys()].sort((a, b) => comparePatches(b, a)).slice(0, PATCHES_PER_SET);
    if (newest.length === 0) {
      await publishSavedSummary(store, set);
      continue;
    }

    const data = await readJson<SetData>(join(DATA_DIR, "latest", `set${set}.json`));
    const forms = new FormInference(data);
    const read: ReadBoards = async (chunk) => (await store.readBoards(chunk)).map((row) => forms.row(row));
    const patches = await Promise.all(newest.map((patch) => loadPatch(read, set, patch, byPatch.get(patch)!)));
    const { stats, unknown } = buildSetStats(data, patches);
    const summaries = (await store.summaries(set)).filter((summary) => summary.patch !== stats.patch);
    const trend = patchTrend(stats, summaries);
    if (trend) stats.trend = trend;
    // Tier lists can switch to another rank floor; each one with enough games, and with games the floors
    // above it don't already cover, gets its own file.
    const floorStats: SetStats[] = [];
    if (stats.status === "ready") {
      let previous = -1;
      for (const floor of RANK_OPTIONS) {
        const floorLines = floor === stats.rankFloor ? stats : buildFloorStats(data, patches, floor);
        if (!floorLines || floorLines.matches === previous) continue;
        previous = floorLines.matches;
        if (floor !== stats.rankFloor) floorStats.push(floorLines);
      }
    }
    if (floorStats.length) stats.ranks = floorStats.map((entry) => entry.rankFloor);
    const json = JSON.stringify(setStatsSchema.parse(stats));
    await writeFile(join(OUT_DIR, `set${set}.json`), json);
    if (stats.status === "ready") await store.putSummary(set, stats.patch, json);
    await writeDetails(
      read,
      data,
      stats,
      chunks.filter((chunk) => chunk.set === set),
    );
    if (floorStats.length) {
      await mkdir(join(OUT_DIR, `set${set}`, "ranks"), { recursive: true });
      for (const entry of floorStats) {
        await writeFile(
          join(OUT_DIR, `set${set}`, "ranks", `${entry.rankFloor}.json`),
          JSON.stringify(setStatsSchema.parse(entry)),
        );
      }
    }
    if (stats.status === "ready") {
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
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

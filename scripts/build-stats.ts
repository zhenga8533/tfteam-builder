import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import {
  autoCompsSchema,
  championStatsSchema,
  type Manifest,
  type SetData,
  type SetStats,
  setStatsSchema,
} from "../src/lib/data/schema.ts";
import { encodeExplorer, type ExplorerBoard } from "../src/lib/explorer/format.ts";
import { BoardResolver, type ResolvedBoard } from "./lib/boards.ts";
import { ChampionAccumulator } from "./lib/champion-stats.ts";
import { CompDetector } from "./lib/comps.ts";
import { FormInference } from "./lib/forms.ts";
import { buildSetStats, FLOOR_BUCKETS } from "./lib/stats.ts";
import { addBoardToPatch } from "./stats/aggregate.ts";
import { type BoardChunk, comparePatches, createStatsStore } from "./stats/state.ts";
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
  const comps = new CompDetector(data);
  await eachBoard((board) => {
    champions.add(board);
    comps.count(board);
  });
  await eachBoard((board) => comps.add(board));
  const detected = comps.results();

  const championStats = champions.results();
  const byChampion = new Map(championStats.map((champion) => [champion.apiName, champion]));
  for (const comp of detected) {
    for (const unit of comp.units) byChampion.get(unit.apiName)?.comps.push(comp.id);
  }

  await mkdir(join(dir, "champions"), { recursive: true });
  for (const champion of championStats) {
    await writeFile(
      join(dir, "champions", `${champion.apiName}.json`),
      JSON.stringify(championStatsSchema.parse(champion)),
    );
  }
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
  console.log(`  ${championStats.length} champion files, ${detected.length} comps`);
}

async function main() {
  const store = createStatsStore(args.stats);
  if (!store) {
    console.log("No R2 credentials or --stats directory; skipping stats.");
    return;
  }
  const chunks = await store.listBoardChunks();
  if (chunks.length === 0) {
    console.log("No stored boards yet; skipping stats.");
    return;
  }

  // Stats describe live ranked games, so they're built against live-patch game data only.
  const manifest = await readJson<Manifest>(join(DATA_DIR, "manifest.json"));
  await mkdir(OUT_DIR, { recursive: true });

  for (const set of manifest.patches.latest.sets) {
    const byPatch = Map.groupBy(
      chunks.filter((chunk) => chunk.set === set),
      (chunk) => chunk.patch,
    );
    const newest = [...byPatch.keys()].sort((a, b) => comparePatches(b, a)).slice(0, PATCHES_PER_SET);
    if (newest.length === 0) continue;

    const data = await readJson<SetData>(join(DATA_DIR, "latest", `set${set}.json`));
    const forms = new FormInference(data);
    const read: ReadBoards = async (chunk) => (await store.readBoards(chunk)).map((row) => forms.row(row));
    const patches = await Promise.all(newest.map((patch) => loadPatch(read, set, patch, byPatch.get(patch)!)));
    const { stats, unknown } = buildSetStats(data, patches);
    const json = JSON.stringify(setStatsSchema.parse(stats));
    await writeFile(join(OUT_DIR, `set${set}.json`), json);
    if (stats.status === "ready") await store.putSummary(set, stats.patch, json);
    await writeDetails(
      read,
      data,
      stats,
      chunks.filter((chunk) => chunk.set === set),
    );

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

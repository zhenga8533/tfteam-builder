import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  championStatsSchema,
  type Manifest,
  type SetData,
  type SetStats,
  setStatsSchema,
} from "../src/lib/data/schema.ts";
import { ChampionAccumulator } from "./lib/champion-stats.ts";
import { buildSetStats, FLOOR_BUCKETS } from "./lib/stats.ts";
import { addBoardToPatch } from "./stats/aggregate.ts";
import { type BoardChunk, comparePatches, createStatsStore, type StatsStore } from "./stats/state.ts";
import type { PatchCounters } from "./stats/types.ts";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const OUT_DIR = join(DATA_DIR, "stats");
/** The site shows the newest patch, falling back to the previous one right after a patch. */
const PATCHES_PER_SET = 2;

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

/** Streams a patch's chunks one at a time, so memory holds counters rather than every board. */
async function loadPatch(store: StatsStore, set: number, patch: string, chunks: BoardChunk[]): Promise<PatchCounters> {
  const counters: PatchCounters = { set, patch, updatedAt: "", buckets: {} };
  for (const chunk of chunks) {
    for (const row of await store.readBoards(chunk)) addBoardToPatch(counters, row);
    const time = chunkTime(chunk.name);
    if (time > counters.updatedAt) counters.updatedAt = time;
  }
  return counters;
}

/**
 * Second pass over the boards behind the published stats (chosen patch and rank floor), for the
 * per-champion detail files.
 */
async function writeDetails(store: StatsStore, data: SetData, stats: SetStats, chunks: BoardChunk[]) {
  const dir = join(OUT_DIR, `set${data.number}`);
  await rm(dir, { recursive: true, force: true });
  if (stats.status !== "ready") return;

  const buckets = new Set(FLOOR_BUCKETS[stats.rankFloor]);
  const champions = new ChampionAccumulator(data);
  for (const chunk of chunks.filter((chunk) => chunk.patch === stats.patch)) {
    for (const row of await store.readBoards(chunk)) if (buckets.has(row[2])) champions.add(row);
  }

  await mkdir(join(dir, "champions"), { recursive: true });
  for (const champion of champions.results()) {
    await writeFile(
      join(dir, "champions", `${champion.apiName}.json`),
      JSON.stringify(championStatsSchema.parse(champion)),
    );
  }
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

    const patches = await Promise.all(newest.map((patch) => loadPatch(store, set, patch, byPatch.get(patch)!)));
    const data = await readJson<SetData>(join(DATA_DIR, "latest", `set${set}.json`));
    const { stats, unknown } = buildSetStats(data, patches);
    const json = JSON.stringify(setStatsSchema.parse(stats));
    await writeFile(join(OUT_DIR, `set${set}.json`), json);
    if (stats.status === "ready") await store.putSummary(set, stats.patch, json);
    await writeDetails(
      store,
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

import { gunzipSync, gzipSync } from "node:zlib";
import { type BlobStore, FileBlobStore } from "./blob.ts";
import { R2BlobStore, r2ConfigFromEnv } from "./r2.ts";
import type { AutoComp, RankFloor, SetStats } from "../../src/lib/data/schema.ts";
import type { TftPatch } from "../lib/tft-patches.ts";
import type { BoardRow, PatchCounters, PlatformState } from "./types.ts";

export interface BoardChunk {
  key: string;
  set: number;
  patch: string;
  /** `{runStart}-{region}`; runStart (`YYYYMMDDTHHMMSSZ`) sorts chronologically. */
  name: string;
}

const BOARD_KEY = /^boards\/set(\d+)\/([^/]+)\/([^/]+)\.jsonl\.gz$/;

/** When a chunk's crawl run started: `20261001T120000Z-americas` → `2026-10-01T12:00:00Z`. */
export const chunkTime = (name: string) =>
  name.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z.*$/, "$1-$2-$3T$4:$5:$6Z");

/**
 * Crawler state and stored boards:
 *   state/{platform}.json                          player pool and last-crawl times
 *   seen/{platform}.txt                            processed match IDs with their game time (epoch s)
 *   patches.json                                   TFT patches (18.3, 18.3b) and when each went live
 *   boards/set{N}/{patch}/{runStart}-{region}.jsonl.gz   one gzipped JSON row per board
 *   summaries/set{N}/{patch}.json                  built stats per patch, kept permanently
 *   summaries/set{N}/ranks/{floor}/{patch}.json    the same for other rank floors
 *   counters/set{N}/{patch}.json.gz                the patch's counters per rank bucket, kept permanently
 *   comps/set{N}/[ranks/{floor}/]{patch}.json       detected comps per patch, for comp trends
 *   archive/set{N}/                                a finished set's final built files (see `freezeSet`)
 */
export class StatsStore {
  readonly blobs: BlobStore;
  /** Patches whose saved summaries and comps are left out (see `supersededPatches`). */
  ignoredPatches = new Set<string>();

  constructor(blobs: BlobStore) {
    this.blobs = blobs;
  }

  private async readJson<T>(key: string): Promise<T | null> {
    const data = await this.blobs.get(key);
    return data ? (JSON.parse(new TextDecoder().decode(data)) as T) : null;
  }

  async platformState(platform: string): Promise<PlatformState> {
    return (await this.readJson<PlatformState>(`state/${platform}.json`)) ?? { players: [] };
  }

  savePlatformState(platform: string, state: PlatformState) {
    return this.blobs.put(`state/${platform}.json`, JSON.stringify(state));
  }

  async seen(platform: string): Promise<Map<string, number>> {
    const data = await this.blobs.get(`seen/${platform}.txt`);
    if (!data) return new Map();
    return new Map(
      new TextDecoder()
        .decode(data)
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [id = "", time = "0"] = line.split("\t");
          return [id, Number(time)];
        }),
    );
  }

  /** Match lists are only requested since each player's last crawl, so old IDs can be forgotten. */
  saveSeen(platform: string, seen: Map<string, number>, keepAfter: number) {
    const lines = [...seen].filter(([, time]) => time >= keepAfter).map(([id, time]) => `${id}\t${time}`);
    return this.blobs.put(`seen/${platform}.txt`, lines.join("\n") + "\n");
  }

  /** The last known TFT patch timeline. */
  async patchTimeline(): Promise<TftPatch[]> {
    return (await this.readJson<TftPatch[]>("patches.json")) ?? [];
  }

  savePatchTimeline(timeline: TftPatch[]) {
    return this.blobs.put("patches.json", JSON.stringify(timeline, null, 2));
  }

  appendBoards(set: number, patch: string, name: string, rows: BoardRow[]) {
    const body = gzipSync(rows.map((row) => JSON.stringify(row)).join("\n"));
    return this.blobs.put(`boards/set${set}/${patch}/${name}.jsonl.gz`, body);
  }

  async listBoardChunks(): Promise<BoardChunk[]> {
    return (await this.blobs.list("boards/")).flatMap((key) => {
      const match = key.match(BOARD_KEY);
      return match ? [{ key, set: Number(match[1]), patch: match[2]!, name: match[3]! }] : [];
    });
  }

  async readBoards(chunk: BoardChunk): Promise<BoardRow[]> {
    const data = await this.blobs.get(chunk.key);
    if (!data) return [];
    return new TextDecoder()
      .decode(gunzipSync(data))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BoardRow);
  }

  /** Keeps boards for the newest `keep` patches of each set; summaries are never pruned. */
  async pruneBoards(keep: number) {
    const bySet = Map.groupBy(await this.listBoardChunks(), (chunk) => chunk.set);
    for (const chunks of bySet.values()) {
      const patches = [...new Set(chunks.map((chunk) => chunk.patch))].sort((a, b) => comparePatches(b, a));
      const stale = new Set(patches.slice(keep));
      for (const chunk of chunks) if (stale.has(chunk.patch)) await this.blobs.delete(chunk.key);
    }
  }

  /**
   * Saves a patch's counters. Unlike its boards they're never pruned, so a patch's stats can be rebuilt after its boards
   * are gone, e.g. when the tiering rules change.
   */
  putCounters(counters: PatchCounters) {
    return this.blobs.put(`counters/set${counters.set}/${counters.patch}.json.gz`, gzipSync(JSON.stringify(counters)));
  }

  async counters(set: number, patch: string): Promise<PatchCounters | null> {
    const data = await this.blobs.get(`counters/set${set}/${patch}.json.gz`);
    return data ? (JSON.parse(gunzipSync(data).toString("utf8")) as PatchCounters) : null;
  }

  /** Saves a patch's stats; `floor` stats (for the tier lists' rank choice) are kept apart. */
  putSummary(set: number, patch: string, json: string, floor?: RankFloor) {
    return this.blobs.put(`${summaryPrefix(set, floor)}${patch}.json`, json);
  }

  /** Saves a patch's detected comps, so the next patch can compare with them. */
  putComps(set: number, patch: string, json: string, floor?: RankFloor) {
    return this.blobs.put(`${compsPrefix(set, floor)}${patch}.json`, json);
  }

  /** The comps of the newest saved patch before `patch`, with that patch; null when there's none. */
  async previousComps(
    set: number,
    patch: string,
    floor?: RankFloor,
  ): Promise<{ patch: string; comps: AutoComp[] } | null> {
    const prefix = compsPrefix(set, floor);
    const previous = (await this.blobs.list(prefix))
      .map((key) => key.slice(prefix.length))
      .filter((name) => !name.includes("/"))
      .map((name) => name.replace(/\.json$/, ""))
      .filter((name) => comparePatches(name, patch) < 0 && !this.ignoredPatches.has(name))
      .sort(comparePatches)
      .at(-1);
    if (!previous) return null;
    const saved = await this.readJson<{ comps: AutoComp[] }>(`${prefix}${previous}.json`);
    return saved ? { patch: previous, comps: saved.comps } : null;
  }

  /** Every saved patch summary of a set (at `floor`, or the default stats), oldest patch first. */
  async summaries(set: number, floor?: RankFloor): Promise<SetStats[]> {
    const prefix = summaryPrefix(set, floor);
    const patches = (await this.blobs.list(prefix))
      .map((key) => key.slice(prefix.length))
      // Rank floors' summaries live in a folder below the default ones.
      .filter((name) => !name.includes("/"))
      .map((name) => name.replace(/\.json$/, ""))
      .filter((name) => !this.ignoredPatches.has(name))
      .sort(comparePatches);
    const summaries = await Promise.all(patches.map((patch) => this.readJson<SetStats>(`${prefix}${patch}.json`)));
    return summaries.filter((summary): summary is SetStats => summary !== null);
  }
}

const compsPrefix = (set: number, floor?: RankFloor) =>
  floor ? `comps/set${set}/ranks/${floor}/` : `comps/set${set}/`;

export const archivePrefix = (set: number) => `archive/set${set}/`;

const summaryPrefix = (set: number, floor?: RankFloor) =>
  floor ? `summaries/set${set}/ranks/${floor}/` : `summaries/set${set}/`;

/** R2 when the `R2_*` environment variables are set, otherwise the local directory `dir`. */
export function createStatsStore(dir: string | undefined): StatsStore | null {
  const r2 = r2ConfigFromEnv();
  if (r2) return new StatsStore(new R2BlobStore(r2));
  return dir ? new StatsStore(new FileBlobStore(dir)) : null;
}

const PATCH_LABEL = /^(\d+)\.(\d+)([a-z]?)$/;

/** Orders TFT patch labels: `18.3` < `18.3b` < `18.4` < `18.10`. */
export function comparePatches(a: string, b: string) {
  const [, aSet = "0", aMinor = "0", aLetter = ""] = a.match(PATCH_LABEL) ?? [];
  const [, bSet = "0", bMinor = "0", bLetter = ""] = b.match(PATCH_LABEL) ?? [];
  return Number(aSet) - Number(bSet) || Number(aMinor) - Number(bMinor) || aLetter.localeCompare(bLetter);
}

/** `2026-10-01T12:00:00.123Z` → `20261001T120000Z`, safe in object keys and chronologically sortable. */
export const runStamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d+/g, "");

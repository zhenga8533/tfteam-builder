import { gunzipSync, gzipSync } from "node:zlib";
import { type BlobStore, FileBlobStore } from "./blob.ts";
import { R2BlobStore, r2ConfigFromEnv } from "./r2.ts";
import type { BoardRow, PatchTimeline, PlatformState } from "./types.ts";

export interface BoardChunk {
  key: string;
  set: number;
  patch: string;
  /** `{runStart}-{region}`; runStart (`YYYYMMDDTHHMMSSZ`) sorts chronologically. */
  name: string;
}

const BOARD_KEY = /^boards\/set(\d+)\/([^/]+)\/([^/]+)\.jsonl\.gz$/;

/**
 * Crawler state and stored boards:
 *   state/{platform}.json                          player pool and last-crawl times
 *   seen/{platform}.txt                            processed match IDs with their game time (epoch s)
 *   patches.json                                   when each live patch was first seen
 *   boards/set{N}/{patch}/{runStart}-{region}.jsonl.gz   one gzipped JSON row per board
 *   summaries/set{N}/{patch}.json                  built stats per patch, kept permanently
 */
export class StatsStore {
  readonly blobs: BlobStore;

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

  async patchTimeline(): Promise<PatchTimeline> {
    return (await this.readJson<PatchTimeline>("patches.json")) ?? [];
  }

  savePatchTimeline(timeline: PatchTimeline) {
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

  putSummary(set: number, patch: string, json: string) {
    return this.blobs.put(`summaries/set${set}/${patch}.json`, json);
  }
}

/** R2 when the `R2_*` environment variables are set, otherwise the local directory `dir`. */
export function createStatsStore(dir: string | undefined): StatsStore | null {
  const r2 = r2ConfigFromEnv();
  if (r2) return new StatsStore(new R2BlobStore(r2));
  return dir ? new StatsStore(new FileBlobStore(dir)) : null;
}

/** Numeric patch comparison, so `16.10` sorts after `16.9`. */
export function comparePatches(a: string, b: string) {
  const [aMajor = 0, aMinor = 0] = a.split(".").map(Number);
  const [bMajor = 0, bMinor = 0] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

/** `2026-10-01T12:00:00.123Z` → `20261001T120000Z`, safe in object keys and chronologically sortable. */
export const runStamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d+/g, "");

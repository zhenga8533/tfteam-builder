/// <reference lib="webworker" />
import {
  type ExplorerFilter,
  type ExplorerResult,
  runQuery,
  runTotalsQuery,
  type SimilarBoards,
  similarBoards,
} from "@/lib/explorer/engine";
import { concatExplorer, decodeExplorer, type ExplorerData } from "@/lib/explorer/format";
import type { ExplorerTotals } from "@/lib/explorer/totals";

/**
 * Every question names the files it's about (see `explorerFiles`): the totals, or one champion's or trait's file per
 * rank, which the worker loads and joins.
 */
export type WorkerRequest =
  | { type: "query"; id: number; urls: string[]; filters: ExplorerFilter[]; floor?: number }
  | { type: "similar"; id: number; urls: string[]; units: string[] };

export type FileStatus =
  { state: "ready"; boards: number } | { state: "missing" } | { state: "error"; message: string };

export type WorkerResponse =
  | { type: "status"; url: string; status: FileStatus }
  /** `null` when the file doesn't exist. */
  | { type: "result"; id: number; result: ExplorerResult | null }
  | { type: "similar"; id: number; result: SimilarBoards | null };

type ExplorerFile = { type: "boards"; data: ExplorerData } | { type: "totals"; totals: ExplorerTotals };

/**
 * Files kept decoded, most recently used last: switching back to a recent champion, or between floors, needs no
 * download.
 */
const CACHED_FILES = 12;
const files = new Map<string, Promise<ExplorerFile | null>>();
const post = (message: WorkerResponse) => self.postMessage(message);

// The dev server answers missing files with index.html, so each reader checks it got what it expected.
async function readTotals(response: Response): Promise<ExplorerFile | null> {
  if (!response.headers.get("content-type")?.includes("json")) return null;
  return { type: "totals", totals: (await response.json()) as ExplorerTotals };
}

async function readBoards(response: Response): Promise<ExplorerFile | null> {
  let buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  // Some hosts decompress .gz responses themselves; only gunzip when the gzip magic bytes are there.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  } else if (String.fromCharCode(...bytes) !== "TFTX") {
    return null;
  }
  return { type: "boards", data: decodeExplorer(buffer) };
}

const boardCount = (file: ExplorerFile) =>
  file.type === "boards" ? file.data.boards : file.totals.groups.reduce((sum, group) => sum + group.summary[0], 0);

async function load(url: string): Promise<ExplorerFile | null> {
  const response = await fetch(url);
  if (!response.ok && response.status !== 404) throw new Error(`Failed to load the boards (${response.status})`);
  const loaded = response.ok ? await (url.endsWith(".json") ? readTotals(response) : readBoards(response)) : null;
  post({ type: "status", url, status: loaded ? { state: "ready", boards: boardCount(loaded) } : { state: "missing" } });
  return loaded;
}

function answer(file: ExplorerFile | null, request: WorkerRequest): WorkerResponse {
  if (request.type === "similar") {
    return {
      type: "similar",
      id: request.id,
      result: file?.type === "boards" ? similarBoards(file.data, request.units) : null,
    };
  }
  const { filters, floor } = request;
  const result = !file
    ? null
    : file.type === "boards"
      ? runQuery(file.data, filters, undefined, floor)
      : runTotalsQuery(file.totals, filters, undefined, floor);
  return { type: "result", id: request.id, result };
}

function file(url: string) {
  let loading = files.get(url);
  if (loading) {
    files.delete(url);
  } else {
    loading = load(url).catch((error: unknown) => {
      post({
        type: "status",
        url,
        status: { state: "error", message: error instanceof Error ? error.message : String(error) },
      });
      // A failed download is retried the next time it's asked for.
      files.delete(url);
      return null;
    });
  }
  files.set(url, loading);
  if (files.size > CACHED_FILES) files.delete(files.keys().next().value!);
  return loading;
}

/**
 * The request's files as one. Joining is a single pass over the boards, cheap next to a query, so it isn't cached. A
 * missing rank's file just has no boards; all of them missing means there's no file.
 */
async function joinFiles(urls: string[]): Promise<ExplorerFile | null> {
  const loaded = (await Promise.all(urls.map(file))).filter((entry) => entry !== null);
  const boards = loaded.flatMap((entry) => (entry.type === "boards" ? [entry.data] : []));
  return boards.length > 1 ? { type: "boards", data: concatExplorer(boards) } : (loaded[0] ?? null);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  void joinFiles(request.urls).then((loaded) => post(answer(loaded, request)));
};

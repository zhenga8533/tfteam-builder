/// <reference lib="webworker" />
import {
  type ExplorerFilter,
  type ExplorerResult,
  runQuery,
  type SimilarBoards,
  similarBoards,
} from "@/lib/explorer/engine";
import { decodeExplorer, type ExplorerData } from "@/lib/explorer/format";

/** Every question names the board file it's about (the sample, or a champion's boards); the worker loads it. */
export type WorkerRequest =
  | { type: "query"; id: number; url: string; filters: ExplorerFilter[]; floor?: number }
  | { type: "similar"; id: number; url: string; units: string[] };

export type FileStatus =
  { state: "ready"; boards: number } | { state: "missing" } | { state: "error"; message: string };

export type WorkerResponse =
  | { type: "status"; url: string; status: FileStatus }
  /** `null` when the file doesn't exist. */
  | { type: "result"; id: number; result: ExplorerResult | null }
  | { type: "similar"; id: number; result: SimilarBoards | null };

/** Files kept decoded, most recently used last; switching back to a recent champion needs no download. */
const CACHED_FILES = 6;
const files = new Map<string, Promise<ExplorerData | null>>();
const post = (message: WorkerResponse) => self.postMessage(message);

async function load(url: string): Promise<ExplorerData | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    post({ type: "status", url, status: { state: "missing" } });
    return null;
  }
  if (!response.ok) throw new Error(`Failed to load the boards (${response.status})`);
  let buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  // Some hosts decompress .gz responses themselves; only gunzip when the gzip magic bytes are there.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  } else if (String.fromCharCode(...bytes) !== "TFTX") {
    // The dev server answers missing files with index.html.
    post({ type: "status", url, status: { state: "missing" } });
    return null;
  }
  const data = decodeExplorer(buffer);
  post({ type: "status", url, status: { state: "ready", boards: data.boards } });
  return data;
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

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  void file(request.url).then((data) => {
    if (request.type === "query") {
      post({
        type: "result",
        id: request.id,
        result: data && runQuery(data, request.filters, undefined, request.floor),
      });
    } else {
      post({ type: "similar", id: request.id, result: data && similarBoards(data, request.units) });
    }
  });
};

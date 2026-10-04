/// <reference lib="webworker" />
import {
  type ExplorerFilter,
  type ExplorerResult,
  runQuery,
  type SimilarBoards,
  similarBoards,
} from "@/lib/explorer/engine";
import { decodeExplorer, type ExplorerData } from "@/lib/explorer/format";

export type WorkerRequest =
  | { type: "load"; url: string }
  | { type: "query"; id: number; filters: ExplorerFilter[]; floor?: number }
  | { type: "similar"; id: number; units: string[] };

export type WorkerResponse =
  | { type: "ready"; boards: number }
  | { type: "missing" }
  | { type: "error"; message: string }
  | { type: "result"; id: number; result: ExplorerResult }
  | { type: "similar"; id: number; result: SimilarBoards | null };

let data: ExplorerData | null = null;
const post = (message: WorkerResponse) => self.postMessage(message);

async function load(url: string) {
  const response = await fetch(url);
  if (response.status === 404) return post({ type: "missing" });
  if (!response.ok) throw new Error(`Failed to load the sample (${response.status})`);
  let buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  // Some hosts decompress .gz responses themselves; only gunzip when the gzip magic bytes are there.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  } else if (String.fromCharCode(...bytes) !== "TFTX") {
    // The dev server answers missing files with index.html.
    return post({ type: "missing" });
  }
  data = decodeExplorer(buffer);
  post({ type: "ready", boards: data.boards });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "load") {
    load(request.url).catch((error: unknown) =>
      post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  } else if (data && request.type === "query") {
    post({ type: "result", id: request.id, result: runQuery(data, request.filters, undefined, request.floor) });
  } else if (data && request.type === "similar") {
    post({ type: "similar", id: request.id, result: similarBoards(data, request.units) });
  }
};

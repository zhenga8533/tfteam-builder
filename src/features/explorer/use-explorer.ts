import { useEffect, useRef, useState } from "react";
import type { ExplorerFilter, ExplorerResult, SimilarBoards } from "@/lib/explorer/engine";
import type { FileStatus, WorkerRequest, WorkerResponse } from "./worker";

export type ExplorerStatus = { state: "loading" } | FileStatus;

/** A question for board files: a filtered query (Explorer) or boards similar to a list of units (builder). */
type Question =
  | { type: "query"; urls: string[]; filters: ExplorerFilter[]; floor?: number }
  | { type: "similar"; urls: string[]; units: string[] };

/** One status for a question's files: an error or a load in progress wins, then any file that's ready. */
function combinedStatus(urls: string[], statuses: Record<string, FileStatus>): ExplorerStatus {
  const each = urls.map((url) => statuses[url]);
  const error = each.find((status) => status?.state === "error");
  if (error) return error;
  if (each.some((status) => status === undefined)) return { state: "loading" };
  const ready = each.flatMap((status) => (status?.state === "ready" ? [status.boards] : []));
  return ready.length
    ? { state: "ready", boards: ready.reduce((sum, boards) => sum + boards, 0) }
    : { state: "missing" };
}
type Answer<Q extends Question> = Q extends { type: "query" } ? ExplorerResult | null : SimilarBoards | null;

/**
 * Asks a Web Worker `question` about board files, so scanning hundreds of thousands of boards never blocks the
 * page. The worker keeps recent files loaded. The latest answer is kept while a newer question is worked out, so
 * results don't flash; `pending` says it's out of date. `null` pauses.
 */
function useBoardWorker<Q extends Question>(question: Q | null) {
  const worker = useRef<Worker | null>(null);
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({});
  const [answer, setAnswer] = useState<{ key: string; result: unknown }>();
  // The latest question; answers to earlier ones are dropped.
  const latest = useRef({ id: 0, key: "" });
  const enabled = question !== null;

  useEffect(() => {
    if (!enabled) return;
    const instance = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "status") {
        setStatuses((current) => ({ ...current, [message.url]: message.status }));
      } else if (message.id === latest.current.id) {
        setAnswer({ key: latest.current.key, result: message.result });
      }
    };
    worker.current = instance;
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, [enabled]);

  // Declared after the worker's effect, so it runs after it too: a page hidden by Suspense and shown again gets a new
  // worker, and its question is asked again.
  const key = question ? JSON.stringify(question) : null;
  useEffect(() => {
    if (!worker.current || !key) return;
    const id = latest.current.id + 1;
    latest.current = { id, key };
    worker.current.postMessage({ ...(JSON.parse(key) as Question), id } satisfies WorkerRequest);
  }, [key]);

  const status: ExplorerStatus = question ? combinedStatus(question.urls, statuses) : { state: "missing" };
  return {
    status,
    answer: answer && (answer.result as Answer<Q>),
    pending: answer?.key !== key,
  };
}

/**
 * The Explorer: stats for boards matching `filters` in the board files at `urls` (see `explorerFiles`), at rank
 * `floor` (an index into `RANK_OPTIONS`; the files' default floor if unset). `result` is undefined until the first
 * answer; `null` urls pauses.
 */
export function useExplorer(urls: string[] | null, filters: ExplorerFilter[], floor?: number) {
  const { status, answer, pending } = useBoardWorker(urls ? { type: "query", urls, filters, floor } : null);
  return { status, result: answer, pending };
}

/** Stats for boards in the files at `urls` that share the most of `units`; `null` units skips loading them. */
export function useSimilarBoards(urls: string[] | null, units: string[] | null) {
  const { status, answer } = useBoardWorker(urls && units ? { type: "similar", urls, units } : null);
  return { status, similar: answer ?? null };
}

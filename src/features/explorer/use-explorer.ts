import { useEffect, useRef, useState } from "react";
import type { ExplorerFilter, ExplorerResult, SimilarBoards } from "@/lib/explorer/engine";
import type { FileStatus, WorkerRequest, WorkerResponse } from "./worker";

export type ExplorerStatus = { state: "loading" } | FileStatus;

/** A question for a board file: a filtered query (Explorer) or boards similar to a list of units (builder). */
type Question =
  | { type: "query"; url: string; filters: ExplorerFilter[]; floor?: number }
  | { type: "similar"; url: string; units: string[] };
type Answer<Q extends Question> = Q extends { type: "query" } ? ExplorerResult | null : SimilarBoards | null;

/**
 * Asks a Web Worker `question` about a board file, so scanning hundreds of thousands of boards never blocks the
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

  const status: ExplorerStatus = question ? (statuses[question.url] ?? { state: "loading" }) : { state: "missing" };
  return {
    status,
    answer: answer && (answer.result as Answer<Q>),
    pending: answer?.key !== key,
  };
}

/**
 * The Explorer: stats for boards matching `filters` in the board file at `url`, at rank `floor` (an index into
 * `RANK_OPTIONS`; the file's default floor if unset). `result` is undefined until the first answer.
 */
export function useExplorer(url: string | null, filters: ExplorerFilter[], floor?: number) {
  const { status, answer, pending } = useBoardWorker(url ? { type: "query", url, filters, floor } : null);
  return { status, result: answer, pending };
}

/** Stats for sample boards that share the most of `units`; `null` units skips loading the sample. */
export function useSimilarBoards(url: string | null, units: string[] | null) {
  const { status, answer } = useBoardWorker(url && units ? { type: "similar", url, units } : null);
  return { status, similar: answer ?? null };
}

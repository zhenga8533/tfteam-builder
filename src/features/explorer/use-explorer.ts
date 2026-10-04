import { useEffect, useRef, useState } from "react";
import type { ExplorerFilter, ExplorerResult, SimilarBoards } from "@/lib/explorer/engine";
import type { WorkerRequest, WorkerResponse } from "./worker";

export type ExplorerStatus =
  | { state: "loading" }
  | { state: "ready"; boards: number }
  | { state: "missing" }
  | { state: "error"; message: string };

/** A question for the sample: a filtered query (Explorer) or boards similar to a list of units (builder). */
type Question = { type: "query"; filters: ExplorerFilter[]; floor?: number } | { type: "similar"; units: string[] };
type Answer<Q extends Question> = Q extends { type: "query" } ? ExplorerResult : SimilarBoards | null;

interface Loaded {
  /** The sample URL this state belongs to; a different URL means a new sample is still loading. */
  url: string;
  status: ExplorerStatus;
  /** The latest answer; kept while a newer question is being worked out, so results don't flash. */
  answer: unknown;
}

/**
 * Loads a set's board sample into a Web Worker and asks it `question` there, so scanning hundreds of
 * thousands of boards never blocks the page. The answer follows the latest question; `null` pauses.
 */
function useSampleWorker<Q extends Question>(url: string | null, question: Q | null) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const current = url && loaded?.url === url ? loaded : null;
  const status: ExplorerStatus = current?.status ?? { state: url ? "loading" : "missing" };

  useEffect(() => {
    if (!url) return;
    const instance = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "result" || message.type === "similar") {
        if (message.id === latest.current) {
          setLoaded((state) => state && { ...state, answer: message.result });
        }
        return;
      }
      const next: ExplorerStatus =
        message.type === "ready"
          ? { state: "ready", boards: message.boards }
          : message.type === "missing"
            ? { state: "missing" }
            : { state: "error", message: message.message };
      setLoaded({ url, status: next, answer: null });
    };
    instance.postMessage({ type: "load", url } satisfies WorkerRequest);
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, [url]);

  const ready = status.state === "ready";
  const key = question ? JSON.stringify(question) : null;
  useEffect(() => {
    if (!ready || !worker.current || !key) return;
    latest.current += 1;
    worker.current.postMessage({ ...(JSON.parse(key) as Question), id: latest.current } satisfies WorkerRequest);
  }, [ready, key]);

  const answer = (current?.answer ?? null) as Answer<Q> | null;
  return { status, answer };
}

/** The Explorer: stats for boards matching `filters`, at rank `floor` (an index into `RANK_OPTIONS`; default floor if unset). */
export function useExplorer(url: string | null, filters: ExplorerFilter[], floor?: number) {
  const { status, answer } = useSampleWorker(url, { type: "query", filters, floor });
  return { status, result: answer };
}

/** Stats for sample boards that share the most of `units`; `null` units skips loading the sample. */
export function useSimilarBoards(url: string | null, units: string[] | null) {
  const { status, answer } = useSampleWorker(units ? url : null, units ? { type: "similar", units } : null);
  return { status, similar: answer };
}

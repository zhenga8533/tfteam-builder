import { useEffect, useRef, useState } from "react";
import type { ExplorerFilter, ExplorerResult } from "@/lib/explorer/engine";
import type { WorkerRequest, WorkerResponse } from "./worker";

export type ExplorerStatus =
  | { state: "loading" }
  | { state: "ready"; boards: number }
  | { state: "missing" }
  | { state: "error"; message: string };

interface Loaded {
  /** The sample URL this state belongs to; a different URL means a new sample is still loading. */
  url: string;
  status: ExplorerStatus;
  result: ExplorerResult | null;
}

/**
 * Loads a set's board sample into a Web Worker and runs queries there, so filtering hundreds of
 * thousands of boards never blocks the page. `result` follows the latest `filters`.
 */
export function useExplorer(url: string | null, filters: ExplorerFilter[]) {
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
      if (message.type === "result") {
        if (message.id === latest.current) setLoaded((state) => state && { ...state, result: message.result });
        return;
      }
      const next: ExplorerStatus =
        message.type === "ready"
          ? { state: "ready", boards: message.boards }
          : message.type === "missing"
            ? { state: "missing" }
            : { state: "error", message: message.message };
      setLoaded({ url, status: next, result: null });
    };
    instance.postMessage({ type: "load", url } satisfies WorkerRequest);
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, [url]);

  const ready = status.state === "ready";
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (!ready || !worker.current) return;
    latest.current += 1;
    worker.current.postMessage({
      type: "query",
      id: latest.current,
      filters: JSON.parse(filterKey) as ExplorerFilter[],
    } satisfies WorkerRequest);
  }, [ready, filterKey]);

  return { status, result: current?.result ?? null };
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addBoardToPatch, matchToRows } from "../lib/aggregate.ts";
import { match } from "../lib/fixtures.ts";
import { FileBlobStore } from "./blob.ts";
import { comparePatches, runStamp, StatsStore } from "./state.ts";
import type { PatchCounters } from "./types.ts";

describe("StatsStore", () => {
  let root: string | undefined;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("keeps rank floor summaries apart from the default ones", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    const summary = (patch: string, matches: number) => JSON.stringify({ patch, matches, status: "ready" });
    await store.putSummary(18, "18.3b", summary("18.3b", 3000));
    await store.putSummary(18, "18.3", summary("18.3", 2500));
    await store.putSummary(18, "18.3b", summary("18.3b", 2100), "master");
    expect((await store.summaries(18)).map((entry) => [entry.patch, entry.matches])).toEqual([
      ["18.3", 2500],
      ["18.3b", 3000],
    ]);
    expect((await store.summaries(18, "master")).map((entry) => entry.matches)).toEqual([2100]);
  });

  it("leaves out ignored patches' summaries and comps", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    for (const patch of ["18.3b", "18.4", "18.4b"]) {
      await store.putSummary(18, patch, JSON.stringify({ patch, status: "ready" }));
      await store.putComps(18, patch, JSON.stringify({ comps: [] }));
    }
    store.ignoredPatches = new Set(["18.4"]);
    expect((await store.summaries(18)).map((entry) => entry.patch)).toEqual(["18.3b", "18.4b"]);
    expect((await store.previousComps(18, "18.4b"))?.patch).toBe("18.3b");
  });

  it("keeps a patch's counters after its boards are pruned", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    const counters: PatchCounters = { set: 18, patch: "16.9", updatedAt: "2026-10-01T12:00:00Z", buckets: {} };
    for (const row of matchToRows(match(), "diamond")) addBoardToPatch(counters, row);
    await store.putCounters(counters);
    for (const patch of ["16.9", "16.10", "16.11"]) {
      await store.appendBoards(18, patch, "20261001T120000Z-americas", matchToRows(match(), "diamond"));
    }
    await store.pruneBoards(2);
    expect(await store.counters(18, "16.9")).toEqual(counters);
    expect(await store.counters(18, "16.10")).toBeNull();
  });

  it("round-trips state and boards, and prunes old patches and match IDs", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    await store.savePlatformState("na1", {
      seededAt: "2026-09-30T00:00:00Z",
      players: [{ puuid: "p", bucket: "diamond" }],
    });
    expect((await store.platformState("na1")).players).toHaveLength(1);
    expect(await store.platformState("kr")).toEqual({ players: [] });

    await store.saveSeen(
      "na1",
      new Map([
        ["NA1_old", 10],
        ["NA1_new", 100],
      ]),
      50,
    );
    expect([...(await store.seen("na1")).keys()]).toEqual(["NA1_new"]);

    const rows = matchToRows(match(), "diamond");
    for (const patch of ["16.9", "16.10", "16.11"]) {
      await store.appendBoards(18, patch, "20261001T120000Z-americas", rows);
    }
    await store.putSummary(18, "16.9", "{}");
    const chunks = await store.listBoardChunks();
    expect(chunks.find((chunk) => chunk.patch === "16.11")).toMatchObject({
      key: "boards/set18/16.11/20261001T120000Z-americas.jsonl.gz",
      set: 18,
      name: "20261001T120000Z-americas",
    });
    expect(await store.readBoards(chunks[0]!)).toEqual(rows);

    await store.pruneBoards(2);
    expect((await store.listBoardChunks()).map((chunk) => chunk.patch).sort(comparePatches)).toEqual([
      "16.10",
      "16.11",
    ]);
    expect(await store.blobs.get("summaries/set18/16.9.json")).not.toBeNull();
  });

  it("prunes boards filed under a patch replaced on its release day as the replacing patch's", async () => {
    root = await mkdtemp(join(tmpdir(), "tft-stats-"));
    const store = new StatsStore(new FileBlobStore(root));
    const rows = matchToRows(match(), "diamond");
    for (const patch of ["18.3b", "18.4", "18.4b", "18.5"]) {
      await store.appendBoards(18, patch, "20261001T120000Z-americas", rows);
    }
    const day = (date: number) => Date.UTC(2026, 9, date, 18);
    await store.pruneBoards(2, [
      { label: "18.3b", set: 18, since: day(1) },
      { label: "18.4", set: 18, since: day(7) },
      { label: "18.4b", set: 18, since: day(7) },
      { label: "18.5", set: 18, since: day(21) },
    ]);
    // 18.4's boards are 18.4b's, so they stay with it as one of the two newest patches.
    expect((await store.listBoardChunks()).map((chunk) => chunk.patch).sort(comparePatches)).toEqual([
      "18.4",
      "18.4b",
      "18.5",
    ]);
  });

  it("orders TFT patch labels, b patches included", () => {
    expect(["18.10", "18.3b", "17.9", "18.3", "18.4"].sort(comparePatches)).toEqual([
      "17.9",
      "18.3",
      "18.3b",
      "18.4",
      "18.10",
    ]);
  });

  it("stamps runs so chunk names sort chronologically", () => {
    expect(runStamp(new Date("2026-10-01T09:05:03.123Z"))).toBe("20261001T090503Z");
  });
});

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileBlobStore } from "../stats/blob.ts";
import { StatsStore } from "../stats/state.ts";
import type { BoardRow } from "../stats/types.ts";
import { cleanUpSupersededPatches } from "./superseded.ts";

const RELEASE = Date.UTC(2026, 9, 7, 18);
const board = (matchId: string, placement: number, timeMs: number): BoardRow => [
  matchId,
  Math.floor(timeMs / 1000),
  "diamond",
  placement,
  8,
  [],
  [],
  {},
];

describe("cleanUpSupersededPatches", () => {
  let root: string;
  let store: StatsStore;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "superseded-"));
    store = new StatsStore(new FileBlobStore(root));
    // 18.4's b patch is dated its release day, so 18.4 had no time of its own.
    await store.savePatchTimeline([
      { label: "18.3b", set: 18, since: RELEASE - 10 * 86_400_000 },
      { label: "18.4", set: 18, since: RELEASE },
      { label: "18.4b", set: 18, since: RELEASE },
    ]);
    const later = RELEASE + 3_600_000;
    await store.appendBoards(18, "18.4", "run1-americas", [board("NA1_1", 1, later), board("NA1_1", 2, later)]);
    // The same run also filed some boards under 18.4b; one of them is in both chunks.
    await store.appendBoards(18, "18.4", "run2-europe", [board("EUW1_1", 1, later)]);
    await store.appendBoards(18, "18.4b", "run2-europe", [board("EUW1_1", 1, later), board("EUW1_2", 1, later)]);
    for (const key of [
      "summaries/set18/18.4.json",
      "summaries/set18/ranks/master/18.4.json",
      "comps/set18/18.4.json",
      "counters/set18/18.4.json.gz",
      "summaries/set18/18.4b.json",
      "comps/set18/18.4b.json",
    ]) {
      await store.blobs.put(key, "{}");
    }
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it("reports what it would change without changing anything", async () => {
    const result = await cleanUpSupersededPatches(store, false);
    expect(result.patches).toEqual(["18.4"]);
    expect(result.moves.map((move) => [move.from, move.to])).toEqual([
      ["boards/set18/18.4/run1-americas.jsonl.gz", ["18.4b"]],
      ["boards/set18/18.4/run2-europe.jsonl.gz", ["18.4b"]],
    ]);
    expect(result.deletes.sort()).toEqual([
      "comps/set18/18.4.json",
      "counters/set18/18.4.json.gz",
      "summaries/set18/18.4.json",
      "summaries/set18/ranks/master/18.4.json",
    ]);
    expect((await store.listBoardChunks()).filter((chunk) => chunk.patch === "18.4")).toHaveLength(2);
    expect(await store.blobs.get("summaries/set18/18.4.json")).not.toBeNull();
  });

  it("moves boards to their patch, merging without duplicates, and deletes the superseded patch's files", async () => {
    await cleanUpSupersededPatches(store, true);
    const chunks = await store.listBoardChunks();
    expect(chunks.map((chunk) => chunk.key).sort()).toEqual([
      "boards/set18/18.4b/run1-americas.jsonl.gz",
      "boards/set18/18.4b/run2-europe.jsonl.gz",
    ]);
    const merged = await store.readBoards(chunks.find((chunk) => chunk.name === "run2-europe")!);
    expect(merged.map((row) => row[0]).sort()).toEqual(["EUW1_1", "EUW1_2"]);
    expect(await store.blobs.get("summaries/set18/18.4.json")).toBeNull();
    expect(await store.blobs.get("counters/set18/18.4.json.gz")).toBeNull();
    expect(await store.blobs.get("summaries/set18/18.4b.json")).not.toBeNull();
    expect(await store.blobs.get("comps/set18/18.4b.json")).not.toBeNull();
  });

  it("does nothing without superseded patches", async () => {
    await store.savePatchTimeline([{ label: "18.4b", set: 18, since: RELEASE }]);
    expect(await cleanUpSupersededPatches(store, true)).toEqual({ patches: [], moves: [], deletes: [] });
  });
});

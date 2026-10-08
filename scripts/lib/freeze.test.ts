import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileBlobStore } from "../stats/blob.ts";
import type { BoardChunk } from "../stats/state.ts";
import { FREEZE_AFTER_DAYS, freezeSet, restoreArchive, restoreFrozenGameData, shouldFreeze } from "./freeze.ts";

const chunk = (set: number, name: string): BoardChunk => ({ key: "", set, patch: "18.5", name });

describe("shouldFreeze", () => {
  const now = new Date("2026-12-20T00:00:00Z");
  const chunks = [chunk(18, "20261205T120000Z-americas"), chunk(18, "20261210T120000Z-europe")];

  it("never freezes the live set", () => {
    expect(shouldFreeze(18, 18, chunks, now)).toBe(false);
  });

  it(`freezes a finished set once its newest boards are over ${FREEZE_AFTER_DAYS} days old`, () => {
    expect(shouldFreeze(18, 19, chunks, now)).toBe(true);
    expect(shouldFreeze(18, 19, chunks, new Date("2026-12-16T00:00:00Z"))).toBe(false);
  });

  it("leaves a set without boards alone", () => {
    expect(shouldFreeze(17, 19, chunks, now)).toBe(false);
  });
});

describe("freezeSet and restoreArchive", () => {
  let root: string;
  let outDir: string;
  let dataDir: string;
  let store: FileBlobStore;
  let bucket: FileBlobStore;
  const write = async (path: string, contents: string) => {
    await mkdir(dirname(join(outDir, path)), { recursive: true });
    await writeFile(join(outDir, path), contents);
  };
  const read = (path: string) => readFile(join(outDir, path), "utf8");

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "freeze-"));
    outDir = join(root, "out");
    dataDir = join(root, "data");
    await mkdir(dataDir);
    await writeFile(join(dataDir, "set18.json"), JSON.stringify({ number: 18, champions: ["Ahri"] }));
    store = new FileBlobStore(join(root, "private"));
    bucket = new FileBlobStore(join(root, "public"));
    await write("set18.json", JSON.stringify({ set: 18, patch: "18.5" }));
    await write("set18/ranks/master_plus.json", JSON.stringify({ set: 18 }));
    await write("set18/ranks/master_plus.comps.json", JSON.stringify({ comps: [] }));
    await write("set18/champions/Ahri.json", JSON.stringify({ apiName: "Ahri" }));
    await write("set18/explorer/totals.json", "{}");
    // Left over from an earlier, interrupted freeze; the new build doesn't have it.
    await store.put("archive/set18/files/set18/champions/Gone.json", "{}");
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it("archives the build, marks its stats final and restores it without rebuilding", async () => {
    expect(await restoreArchive(store, outDir, 18)).toBeNull();

    const now = new Date("2026-12-20T00:00:00Z");
    expect(await freezeSet(store, bucket, outDir, dataDir, 18, "18.5", now)).toEqual({ files: 4, explorerFiles: 1 });
    expect(await bucket.list("archive/")).toEqual(["archive/set18/explorer/totals.json"]);
    expect((await store.list("archive/set18/files/")).sort()).toEqual([
      "archive/set18/files/set18.json",
      "archive/set18/files/set18/champions/Ahri.json",
      "archive/set18/files/set18/ranks/master_plus.comps.json",
      "archive/set18/files/set18/ranks/master_plus.json",
    ]);
    expect(await readdir(join(outDir, "set18"))).not.toContain("explorer");
    expect(JSON.parse(await read("set18.json"))).toEqual({ set: 18, patch: "18.5", frozen: true });
    expect(JSON.parse(await read("set18/ranks/master_plus.json")).frozen).toBe(true);
    expect(JSON.parse(await read("set18/ranks/master_plus.comps.json"))).toEqual({ comps: [] });

    await rm(outDir, { recursive: true });
    expect(await restoreArchive(store, outDir, 18)).toEqual({ patch: "18.5", frozenAt: now.toISOString() });
    expect(JSON.parse(await read("set18.json")).frozen).toBe(true);
    expect(JSON.parse(await read("set18/champions/Ahri.json"))).toEqual({ apiName: "Ahri" });
  });

  it("keeps the game data the set was frozen with, even once the client changes or drops it", async () => {
    expect(await restoreFrozenGameData(store, dataDir)).toEqual([]);
    await freezeSet(store, bucket, outDir, dataDir, 18, "18.5", new Date());

    await writeFile(join(dataDir, "set18.json"), JSON.stringify({ number: 18, champions: ["Changed"] }));
    expect(await restoreFrozenGameData(store, dataDir)).toEqual([18]);
    expect(JSON.parse(await readFile(join(dataDir, "set18.json"), "utf8"))).toEqual({
      number: 18,
      champions: ["Ahri"],
    });

    await rm(dataDir, { recursive: true });
    expect(await restoreFrozenGameData(store, dataDir)).toEqual([18]);
    expect(JSON.parse(await readFile(join(dataDir, "set18.json"), "utf8")).champions).toEqual(["Ahri"]);
  });
});

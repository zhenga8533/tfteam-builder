import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileBlobStore } from "../store/blob.ts";
import { buildKey, markBuild, restoreBuild, saveBuild } from "./build-cache.ts";

let root: string;
const write = async (path: string, contents: string) => {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), contents);
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "build-cache-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("buildKey", () => {
  beforeEach(async () => {
    await write("scripts/build-stats.ts", "build");
    await write("src/lib/game/traits.ts", "traits");
    await write("src/routes/index.tsx", "page");
    await write("package-lock.json", "{}");
    await write("public/data/latest/set18.json", "{}");
  });

  it("changes with the boards and the stats' sources, not with the site's own code", async () => {
    const key = await buildKey(root, { chunks: ["a"] });
    expect(await buildKey(root, { chunks: ["a"] })).toBe(key);
    expect(await buildKey(root, { chunks: ["a", "b"] })).not.toBe(key);

    await write("src/routes/index.tsx", "new page");
    expect(await buildKey(root, { chunks: ["a"] })).toBe(key);
    for (const path of ["scripts/build-stats.ts", "src/lib/game/traits.ts", "package-lock.json"]) {
      await write(path, "changed");
      expect(await buildKey(root, { chunks: ["a"] })).not.toBe(key);
    }
  });

  it("changes with the game data", async () => {
    const key = await buildKey(root, {});
    await write("public/data/latest/set18.json", '{"traits":[]}');
    expect(await buildKey(root, {})).not.toBe(key);
  });
});

describe("saveBuild and restoreBuild", () => {
  let outDir: string;
  let store: FileBlobStore;

  beforeEach(async () => {
    outDir = join(root, "stats");
    store = new FileBlobStore(join(root, "bucket"));
    await write("stats/set18.json", "stats");
    await write("stats/set18/comps.json", "comps");
    await write("stats/set18/explorer/totals.json", "totals");
  });

  it("restores the stats files, without the Explorer's, once the build is marked", async () => {
    expect(await saveBuild(store, outDir)).toBe(2);
    expect(await restoreBuild(store, outDir, "k1")).toBeNull();

    await markBuild(store, { key: "k1", explorerRun: "123" });
    await rm(outDir, { recursive: true });
    expect(await restoreBuild(store, outDir, "k2")).toBeNull();
    expect(await restoreBuild(store, outDir, "k1")).toEqual({ key: "k1", explorerRun: "123" });
    expect(await readFile(join(outDir, "set18.json"), "utf8")).toBe("stats");
    expect(await readFile(join(outDir, "set18/comps.json"), "utf8")).toBe("comps");
    expect(await store.list("build/files/set18/explorer/")).toEqual([]);
  });

  it("unmarks the previous build before saving, and drops files the new build doesn't have", async () => {
    await write("stats/set17.json", "old set");
    await saveBuild(store, outDir);
    await markBuild(store, { key: "k1", explorerRun: "123" });

    await rm(join(outDir, "set17.json"));
    await saveBuild(store, outDir);
    expect(await restoreBuild(store, outDir, "k1")).toBeNull();
    expect(await store.list("build/files/set17")).toEqual([]);
  });
});

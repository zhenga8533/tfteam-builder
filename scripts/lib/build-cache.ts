import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type { BlobStore } from "../stats/blob.ts";
import { forEachConcurrently } from "./parallel.ts";

/**
 * The last full stats build, kept so a deploy with nothing new to build (e.g. after a site-only change) republishes it
 * instead of rebuilding: its stats files here, and its Explorer files in the public bucket's folder for its run.
 */
const FILES_PREFIX = "build/files/";
/** Written once the build's Explorer files are published too; a build without it is never reused. */
const MARKER_KEY = "build/complete.json";
const CONCURRENT_REQUESTS = 8;

/** What the stats depend on besides the boards: the code that builds them, its dependencies and the game data. */
const SOURCES = ["scripts", "src/lib", "package-lock.json", "public/data/latest"];

export interface BuildMarker {
  key: string;
  /** The run whose public Explorer folder holds the build's Explorer files. */
  explorerRun: string;
}

async function filesUnder(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { recursive: true, withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOTDIR") return [path];
    if (code === "ENOENT") return [];
    throw error;
  }
}

const toKey = (root: string, file: string) => relative(root, file).split(sep).join("/");

/** Identifies a build by `state` (the boards and sets it covers) and the contents of every source under `root`. */
export async function buildKey(root: string, state: unknown): Promise<string> {
  const hash = createHash("sha256").update(JSON.stringify(state));
  for (const source of SOURCES) {
    const files = (await filesUnder(join(root, source))).map((file) => toKey(root, file)).sort();
    for (const file of files) hash.update(`\0${file}\0`).update(await readFile(join(root, file)));
  }
  return hash.digest("hex");
}

/** Explorer files are published to the public bucket rather than kept here. */
const isExplorerFile = (path: string) => /^set\d+\/explorer\//.test(path);

/**
 * Saves the stats files under `outDir` as the last build. The previous build's marker goes first, so a save that
 * doesn't finish is never reused; `markBuild` adds the new one once the Explorer files are published.
 */
export async function saveBuild(store: BlobStore, outDir: string): Promise<number> {
  await store.delete(MARKER_KEY);
  const paths = (await filesUnder(outDir)).map((file) => toKey(outDir, file)).filter((path) => !isExplorerFile(path));
  const written = new Set(paths.map((path) => `${FILES_PREFIX}${path}`));
  await forEachConcurrently(paths, CONCURRENT_REQUESTS, async (path) =>
    store.put(`${FILES_PREFIX}${path}`, await readFile(join(outDir, path))),
  );
  const stale = (await store.list(FILES_PREFIX)).filter((key) => !written.has(key));
  await forEachConcurrently(stale, CONCURRENT_REQUESTS, (key) => store.delete(key));
  return paths.length;
}

export const markBuild = (store: BlobStore, marker: BuildMarker) => store.put(MARKER_KEY, JSON.stringify(marker));

/** Writes the last build's stats files to `outDir` when it was built from the same inputs; null otherwise. */
export async function restoreBuild(store: BlobStore, outDir: string, key: string): Promise<BuildMarker | null> {
  const saved = await store.get(MARKER_KEY);
  if (!saved) return null;
  const marker = JSON.parse(new TextDecoder().decode(saved)) as BuildMarker;
  if (marker.key !== key) return null;
  await rm(outDir, { recursive: true, force: true });
  await forEachConcurrently(await store.list(FILES_PREFIX), CONCURRENT_REQUESTS, async (key) => {
    const data = await store.get(key);
    if (!data) throw new Error(`Saved stats file ${key} disappeared while restoring the last build`);
    const file = join(outDir, key.slice(FILES_PREFIX.length));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  });
  return marker;
}

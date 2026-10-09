import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { type BlobStore, FileBlobStore } from "../store/blob.ts";
import { R2BlobStore, r2ConfigFromEnv } from "../store/r2.ts";
import { archivePrefix, type BoardChunk, chunkTime } from "../store/state.ts";
import { explorerHeaders } from "./explorer-publish.ts";

/** A set that has left the live game freezes once this long has passed without new boards. */
export const FREEZE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;

/** Written last when a set is frozen; while it exists, deploys publish the archive instead of rebuilding the set. */
interface ArchiveMarker {
  patch: string;
  frozenAt: string;
}

const markerKey = (set: number) => `${archivePrefix(set)}complete.json`;
/** The set's built files, keyed by their path under `public/data/stats`. */
const filesPrefix = (set: number) => `${archivePrefix(set)}files/`;
/**
 * The set's game data as it was when frozen. Riot stops maintaining a set once it leaves the live game, so the client's
 * copy can drift from what the stats were built against, or disappear.
 */
const gameDataKey = (set: number) => `${archivePrefix(set)}game-data.json`;
const GAME_DATA_KEY = /^archive\/set(\d+)\/game-data\.json$/;

/** Whether `set` is finished: not the live set, and without new boards for `FREEZE_AFTER_DAYS`. */
export function shouldFreeze(set: number, liveSet: number, chunks: BoardChunk[], now: Date): boolean {
  if (set === liveSet) return false;
  const newest = Math.max(
    ...chunks.filter((chunk) => chunk.set === set).map((chunk) => new Date(chunkTime(chunk.name)).getTime()),
  );
  return Number.isFinite(newest) && now.getTime() - newest > FREEZE_AFTER_DAYS * DAY_MS;
}

/** Where frozen sets' Explorer files go: the public bucket when configured, else `dir` (local runs). */
export function createArchiveBucket(dir: string | undefined): BlobStore | null {
  const r2 = r2ConfigFromEnv(process.env.R2_PUBLIC_BUCKET);
  if (r2) return new R2BlobStore(r2);
  return dir ? new FileBlobStore(dir) : null;
}

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

/** Files carrying `SetStats`, which say the stats are final once frozen. */
const isSetStats = (path: string) =>
  /^set\d+(\.json|\/(ranks|regions)\/[^/]+\.json)$/.test(path) && !path.endsWith(".comps.json");

/**
 * Archives a set's freshly built files under `outDir`: Explorer files to `bucket` (served publicly from
 * `archive/set{N}/explorer/`, and removed locally so they aren't published with the live build), everything else to
 * `store`, along with its game data from `dataDir`, then the marker. Archive files the new build no longer has are
 * removed, so re-freezing starts clean.
 */
export async function freezeSet(
  store: BlobStore,
  bucket: BlobStore,
  outDir: string,
  dataDir: string,
  set: number,
  patch: string,
  now: Date,
): Promise<{ files: number; explorerFiles: number }> {
  const paths = [join(outDir, `set${set}.json`), ...(await filesUnder(join(outDir, `set${set}`)))];
  const explorerPrefix = `set${set}/explorer/`;
  const written = { files: new Set<string>(), explorer: new Set<string>() };

  for (const file of paths) {
    const path = relative(outDir, file).split(sep).join("/");
    if (path.startsWith(explorerPrefix)) {
      const key = `archive/${path}`;
      await bucket.put(key, await readFile(file), explorerHeaders(path));
      written.explorer.add(key);
      continue;
    }
    let contents = await readFile(file, "utf8");
    if (isSetStats(path)) {
      contents = JSON.stringify({ ...JSON.parse(contents), frozen: true });
      await writeFile(file, contents);
    }
    const key = `${filesPrefix(set)}${path}`;
    await store.put(key, contents);
    written.files.add(key);
  }
  for (const key of await store.list(filesPrefix(set))) if (!written.files.has(key)) await store.delete(key);
  for (const key of await bucket.list(`archive/${explorerPrefix}`))
    if (!written.explorer.has(key)) await bucket.delete(key);
  await rm(join(outDir, explorerPrefix), { recursive: true, force: true });
  await store.put(gameDataKey(set), await readFile(join(dataDir, `set${set}.json`)));

  const marker: ArchiveMarker = { patch, frozenAt: now.toISOString() };
  await store.put(markerKey(set), JSON.stringify(marker));
  return { files: written.files.size, explorerFiles: written.explorer.size };
}

/** Writes a frozen set's archived files back under `outDir`; null when the set isn't frozen. */
export async function restoreArchive(store: BlobStore, outDir: string, set: number): Promise<ArchiveMarker | null> {
  const marker = await store.get(markerKey(set));
  if (!marker) return null;
  await rm(join(outDir, `set${set}`), { recursive: true, force: true });
  for (const key of await store.list(filesPrefix(set))) {
    const data = await store.get(key);
    if (!data) throw new Error(`Archived file ${key} disappeared while restoring set ${set}`);
    const file = join(outDir, key.slice(filesPrefix(set).length));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return JSON.parse(new TextDecoder().decode(marker)) as ArchiveMarker;
}

/**
 * Writes each archived set's game data to `dataDir` (`public/data/latest`), over the client's copy if it still has one.
 * Returns the sets restored, so the manifest can list sets the client no longer has.
 */
export async function restoreFrozenGameData(store: BlobStore, dataDir: string): Promise<number[]> {
  const sets: number[] = [];
  for (const key of await store.list("archive/")) {
    const set = Number(key.match(GAME_DATA_KEY)?.[1]);
    if (!set) continue;
    const data = await store.get(key);
    if (!data) throw new Error(`Archived game data ${key} disappeared while restoring it`);
    await mkdir(dataDir, { recursive: true });
    await writeFile(join(dataDir, `set${set}.json`), data);
    sets.push(set);
  }
  return sets;
}

/**
 * Moves the Explorer's built files (see `EXPLORER_FILES`) from `public/data/stats` to the public R2 bucket, so they're
 * served from there rather than bundled into the site. Each build gets its own folder, so a deployed site only ever
 * reads its own build's files; older folders are deleted. Hands the folder's URL to the site build as
 * `VITE_EXPLORER_BASE` through `GITHUB_ENV`, along with `VITE_EXPLORER_ARCHIVE_BASE` for frozen sets' files (uploaded
 * once by the stats build, see `freezeSet`). Without the public bucket configured, the files stay in the site.
 */
import { appendFile, readdir, readFile, rm } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { explorerHeaders, staleKeys } from "./lib/explorer-publish.ts";
import { forEachConcurrently } from "./lib/parallel.ts";
import { R2BlobStore, r2ConfigFromEnv } from "./stats/r2.ts";

const STATS_DIR = join(import.meta.dirname, "..", "public", "data", "stats");
/** Requests to R2 in flight at once: one at a time, hundreds of files take minutes. */
const CONCURRENT_REQUESTS = 8;

async function main() {
  const { R2_PUBLIC_BUCKET, EXPLORER_PUBLIC_URL, GITHUB_RUN_ID, GITHUB_ENV, GITHUB_STEP_SUMMARY } = process.env;
  const r2 = r2ConfigFromEnv(R2_PUBLIC_BUCKET);
  if (!r2 || !EXPLORER_PUBLIC_URL || !GITHUB_RUN_ID) {
    console.log("No public R2 bucket configured; the Explorer's files stay in the site.");
    return;
  }

  const publicUrl = EXPLORER_PUBLIC_URL.replace(/\/$/, "");
  if (GITHUB_ENV) await appendFile(GITHUB_ENV, `VITE_EXPLORER_ARCHIVE_BASE=${publicUrl}/archive/\n`);

  const sets = (await readdir(STATS_DIR, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const folders = sets.map((set) => join(STATS_DIR, set.name, "explorer"));
  const files = (
    await Promise.all(
      folders.map(async (folder) =>
        (await readdir(folder, { recursive: true, withFileTypes: true }).catch(() => []))
          .filter((entry) => entry.isFile())
          .map((entry) => join(entry.parentPath, entry.name)),
      ),
    )
  ).flat();
  if (files.length === 0) {
    console.log("No Explorer files to publish.");
    return;
  }

  const bucket = new R2BlobStore(r2);
  let bytes = 0;
  await forEachConcurrently(files, CONCURRENT_REQUESTS, async (file) => {
    const path = relative(STATS_DIR, file).split(sep).join("/");
    const contents = await readFile(file);
    await bucket.put(`${GITHUB_RUN_ID}/${path}`, contents, explorerHeaders(path));
    bytes += contents.byteLength;
  });
  const stale = staleKeys(await bucket.list(""));
  await forEachConcurrently(stale, CONCURRENT_REQUESTS, (key) => bucket.delete(key));
  for (const folder of folders) await rm(folder, { recursive: true, force: true });

  const base = `${publicUrl}/${GITHUB_RUN_ID}/`;
  if (GITHUB_ENV) await appendFile(GITHUB_ENV, `VITE_EXPLORER_BASE=${base}\n`);
  const summary =
    `Published ${files.length} Explorer files (${(bytes / 1e6).toFixed(1)} MB) to ${base}` +
    (stale.length ? `, removing ${stale.length} from older builds` : "");
  console.log(summary);
  if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, `\n${summary}.\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

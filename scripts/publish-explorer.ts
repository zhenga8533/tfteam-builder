/**
 * Moves the Explorer's built files (see `EXPLORER_FILES`) from `public/data/stats` to the public R2 bucket, so they're
 * served from there rather than bundled into the site. Each build gets its own folder, so a deployed site only ever
 * reads its own build's files; older folders are deleted. Hands the folder's URL to the site build as
 * `VITE_EXPLORER_BASE` through `GITHUB_ENV`. Without the public bucket configured, the files stay in the site.
 */
import { appendFile, readdir, readFile, rm } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { explorerHeaders, staleKeys } from "./lib/explorer-publish.ts";
import { R2BlobStore, r2ConfigFromEnv } from "./stats/r2.ts";

const STATS_DIR = join(import.meta.dirname, "..", "public", "data", "stats");

async function main() {
  const { R2_PUBLIC_BUCKET, EXPLORER_PUBLIC_URL, GITHUB_RUN_ID, GITHUB_ENV, GITHUB_STEP_SUMMARY } = process.env;
  const r2 = r2ConfigFromEnv();
  if (!r2 || !R2_PUBLIC_BUCKET || !EXPLORER_PUBLIC_URL || !GITHUB_RUN_ID) {
    console.log("No public R2 bucket configured; the Explorer's files stay in the site.");
    return;
  }

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

  const bucket = new R2BlobStore({ ...r2, bucket: R2_PUBLIC_BUCKET });
  let bytes = 0;
  for (const file of files) {
    const path = relative(STATS_DIR, file).split(sep).join("/");
    const contents = await readFile(file);
    await bucket.put(`${GITHUB_RUN_ID}/${path}`, contents, explorerHeaders(path));
    bytes += contents.byteLength;
  }
  const stale = staleKeys(await bucket.list(""));
  for (const key of stale) await bucket.delete(key);
  for (const folder of folders) await rm(folder, { recursive: true, force: true });

  const base = `${EXPLORER_PUBLIC_URL.replace(/\/$/, "")}/${GITHUB_RUN_ID}/`;
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

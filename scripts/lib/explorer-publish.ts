/**
 * Builds whose Explorer folders stay in the public bucket: this one, the live site's (until this deploy replaces it,
 * and for visitors still on it), and one more in case a deploy uploaded its files but never went live.
 */
export const KEPT_BUILDS = 3;

/** Keys in folders of builds older than the newest `keep`; folders are named by GitHub Actions run IDs. */
export function staleKeys(keys: string[], keep = KEPT_BUILDS): string[] {
  const build = (key: string) => key.split("/")[0]!;
  const builds = [...new Set(keys.map(build))].sort((a, b) => Number(b) - Number(a));
  const kept = new Set(builds.slice(0, keep));
  return keys.filter((key) => !kept.has(build(key)));
}

/** Headers for a public Explorer file. Each build's files live in their own folder and never change, so caches keep them. */
export const explorerHeaders = (path: string): Record<string, string> => ({
  "Content-Type": path.endsWith(".json") ? "application/json" : "application/octet-stream",
  "Cache-Control": "public, max-age=31536000, immutable",
});

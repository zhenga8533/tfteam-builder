/**
 * A set's Explorer file (see `EXPLORER_FILES`): from the public R2 bucket in deployed builds (a frozen set's from its
 * archive), else from the site.
 */
export function explorerUrl(set: number, path: string, frozen = false) {
  const base = frozen ? import.meta.env.VITE_EXPLORER_ARCHIVE_BASE : import.meta.env.VITE_EXPLORER_BASE;
  return `${base ?? `${import.meta.env.BASE_URL}data/stats/`}set${set}/${path}`;
}

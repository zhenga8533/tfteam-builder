/** A set's Explorer file (see `EXPLORER_FILES`): from the public R2 bucket in deployed builds, else from the site. */
export const explorerUrl = (set: number, path: string) =>
  `${import.meta.env.VITE_EXPLORER_BASE ?? `${import.meta.env.BASE_URL}data/stats/`}set${set}/${path}`;

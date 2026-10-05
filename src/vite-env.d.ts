/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the Explorer's files are served from (the public R2 bucket's folder for this build); unset serves them from the site. */
  readonly VITE_EXPLORER_BASE?: string;
  /** Where frozen sets' Explorer files are served from (the public R2 bucket's archive). */
  readonly VITE_EXPLORER_ARCHIVE_BASE?: string;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the Explorer's files are served from (the public R2 bucket's folder for this build); unset serves them from the site. */
  readonly VITE_EXPLORER_BASE?: string;
}

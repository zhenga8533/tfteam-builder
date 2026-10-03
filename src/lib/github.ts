import { REPOSITORY } from "./site";

/** GitHub rejects longer URLs; past this the file has to be pasted in instead. */
const MAX_URL_LENGTH = 8000;

/**
 * Where to propose a file on GitHub. A new file opens the new-file page with the contents filled in when they fit
 * in the URL; an existing file (GitHub can't prefill edits) or a long one opens a page to paste the copied file into.
 */
export function githubFileLink(path: string, contents: string, exists: boolean): { url: string; paste: boolean } {
  if (exists) return { url: `${REPOSITORY}/edit/main/${path}`, paste: true };
  const slash = path.lastIndexOf("/");
  const page = `${REPOSITORY}/new/main/${path.slice(0, slash)}?filename=${encodeURIComponent(path.slice(slash + 1))}`;
  const prefilled = `${page}&value=${encodeURIComponent(contents)}`;
  return prefilled.length <= MAX_URL_LENGTH ? { url: prefilled, paste: false } : { url: page, paste: true };
}

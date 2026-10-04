import { toast } from "sonner";

const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/** An absolute link to a page of the site, e.g. `siteUrl("builder", { team: code })`. */
export function siteUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${import.meta.env.BASE_URL}${path}`, location.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/**
 * Copies text and confirms with a toast. With `showOnFailure`, a failed copy shows the text in the toast so it can
 * be copied by hand (for short things like links and codes, not whole files).
 */
export async function copyText(text: string, message: string, { showOnFailure = false } = {}) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Couldn't access the clipboard.", showOnFailure ? { description: text } : undefined);
  }
}

/** Copies a PNG that's still being drawn. */
export async function copyImage(image: Promise<Blob>, message: string) {
  try {
    // Safari only allows the write if the ClipboardItem is created during the click, with the image still pending.
    await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
    toast.success(message);
  } catch (error) {
    toast.error("Couldn't copy the image.", { description: errorText(error) });
  }
}

/** Saves a file through a temporary download link. */
export function downloadBlob(blob: Blob, fileName: string) {
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName });
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Draws an image and downloads it, with a toast if drawing fails. */
export async function saveImage(render: () => Promise<Blob>, fileName: string) {
  try {
    downloadBlob(await render(), fileName);
  } catch (error) {
    toast.error("Couldn't create the image.", { description: errorText(error) });
  }
}

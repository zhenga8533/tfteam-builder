/** UTF-8 text as URL-safe base64, without padding, for codes in links. */
export const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const fromBase64Url = (code: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)),
  );

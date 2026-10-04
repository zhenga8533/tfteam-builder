/** Reads an optional string search param, dropping anything that isn't a non-empty string. */
export const stringParam = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

/** Reads an optional numeric search param, accepting numbers or numeric strings. */
export const numberParam = (value: unknown): number | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
};

/** Reads an optional list of strings; a single string (e.g. from an older link) becomes a one-item list. */
export function listParam(value: unknown): string[] | undefined {
  const items = (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return items.length ? [...new Set(items)] : undefined;
}

export const matches = (text: string, query: string | undefined) =>
  !query || text.toLowerCase().includes(query.trim().toLowerCase());

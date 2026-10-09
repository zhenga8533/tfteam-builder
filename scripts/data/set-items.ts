import type { SetData } from "../../src/lib/data/schema.ts";

/**
 * Game data can only guess which of a set's own items (kind "set") players hold rather than redeem as rewards or
 * tokens, so match data decides: keeps the set items in `held`, and drops the others with their aliases.
 */
export function confirmSetItems(data: SetData, held: ReadonlySet<string>): SetData {
  const dropped = new Set(
    data.items.filter((item) => item.kind === "set" && !held.has(item.apiName)).map((item) => item.apiName),
  );
  if (dropped.size === 0) return data;
  return {
    ...data,
    items: data.items.filter((item) => !dropped.has(item.apiName)),
    itemAliases: Object.fromEntries(Object.entries(data.itemAliases).filter(([, target]) => !dropped.has(target))),
  };
}

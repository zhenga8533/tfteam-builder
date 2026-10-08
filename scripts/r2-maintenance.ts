import { parseArgs } from "node:util";
import { cleanUpSupersededPatches } from "./lib/superseded.ts";
import { createStatsStore } from "./stats/state.ts";

/**
 * Cleans up the stats store: what patches replaced on their release day left behind (see `cleanUpSupersededPatches`).
 * A dry run unless `--apply`; `--stats <dir>` runs it on a local store instead of R2.
 */
const { values: args } = parseArgs({ options: { apply: { type: "boolean" }, stats: { type: "string" } } });

const store = createStatsStore(args.stats);
if (!store) throw new Error("No R2 credentials or --stats directory");
const apply = Boolean(args.apply);
const { patches, moves, deletes } = await cleanUpSupersededPatches(store, apply);

console.log(`Superseded patches: ${patches.join(", ") || "none"}`);
console.log(`${apply ? "Moved" : "Would move"} ${moves.length} board chunks:`);
for (const { from, to } of moves) console.log(`  ${from} → ${to.join(", ")}`);
console.log(`${apply ? "Deleted" : "Would delete"} ${deletes.length} files:`);
for (const key of deletes) console.log(`  ${key}`);
if (!apply) console.log("Dry run: nothing was changed. Run again with --apply to make these changes.");

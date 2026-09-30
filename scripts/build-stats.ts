import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { type Manifest, type SetData, setStatsSchema } from "../src/lib/data/schema.ts";
import { buildSetStats } from "./lib/stats.ts";
import { StatsStore } from "./stats/state.ts";
import type { PatchCounters } from "./stats/types.ts";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const OUT_DIR = join(DATA_DIR, "stats");

const { values: args } = parseArgs({ options: { stats: { type: "string", default: "stats" } } });

const readJson = async <T>(path: string) => JSON.parse(await readFile(path, "utf8")) as T;

const top = (names: Map<string, number>) =>
  [...names]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, games]) => `${name} (${games})`)
    .join(", ");

async function main() {
  const store = new StatsStore(args.stats);
  const available = await store.listPatchCounters();
  if (available.length === 0) {
    console.log(`No counters found in ${args.stats}; skipping stats.`);
    return;
  }

  // Stats describe live ranked games, so they're built against live-patch game data only.
  const manifest = await readJson<Manifest>(join(DATA_DIR, "manifest.json"));
  await mkdir(OUT_DIR, { recursive: true });

  for (const set of manifest.patches.latest.sets) {
    const entries = available.filter((entry) => entry.set === set);
    if (entries.length === 0) continue;
    const patches = (await Promise.all(entries.map(({ patch }) => store.patchCounters(set, patch)))).filter(
      (counters): counters is PatchCounters => counters !== null,
    );
    const data = await readJson<SetData>(join(DATA_DIR, "latest", `set${set}.json`));
    const { stats, unknown } = buildSetStats(data, patches);
    await writeFile(join(OUT_DIR, `set${set}.json`), JSON.stringify(setStatsSchema.parse(stats)));

    console.log(
      `set ${set}: ${stats.status}, patch ${stats.patch}, ${stats.rankFloor}+, ${stats.matches} matches` +
        (stats.previousPatch ? " (previous patch)" : ""),
    );
    for (const [kind, names] of Object.entries(unknown)) {
      if (names.size) console.warn(`  unmapped ${kind}: ${top(names)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

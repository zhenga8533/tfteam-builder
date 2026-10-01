import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PATCHES } from "../src/lib/data/constants.ts";
import { type Manifest, manifestSchema, type Patch, setDataSchema } from "../src/lib/data/schema.ts";
import { fetchTeamPlanner, fetchTftData, fetchVersion, patchLabel } from "./lib/cdragon.ts";
import { fetchTftPatches, switcherLabels } from "./lib/tft-patches.ts";
import { buildSet, mainlineSets } from "./lib/transform.ts";

const OUT_DIR = join(import.meta.dirname, "..", "public", "data");
const SETS_PER_PATCH = 3;
const force = process.argv.includes("--force");

async function readManifest(): Promise<Manifest | null> {
  try {
    return manifestSchema.parse(JSON.parse(await readFile(join(OUT_DIR, "manifest.json"), "utf8")));
  } catch {
    return null;
  }
}

async function buildPatch(patch: Patch, version: string) {
  console.log(`[${patch}] fetching ${version}`);
  const [data, teamPlanner] = await Promise.all([fetchTftData(patch), fetchTeamPlanner(patch)]);
  const itemsByApi = new Map(data.items.map((item) => [item.apiName, item]));
  const dir = join(OUT_DIR, patch);
  await mkdir(dir, { recursive: true });

  const sets = mainlineSets(data.setData, SETS_PER_PATCH);
  for (const raw of sets) {
    const set = setDataSchema.parse(buildSet(raw, itemsByApi, teamPlanner, patch));
    await writeFile(join(dir, `set${set.number}.json`), JSON.stringify(set));
    console.log(
      `[${patch}] set ${set.number}: ${set.champions.length} champions, ${set.traits.length} traits, ` +
        `${set.items.length} items, ${set.augments.length} augments`,
    );
  }
  return sets.map((set) => set.number);
}

async function main() {
  const previous = await readManifest();
  const patches = {} as Manifest["patches"];

  for (const patch of PATCHES) {
    const version = patchLabel(await fetchVersion(patch));
    const cached = previous?.patches[patch];
    if (!force && cached?.version === version) {
      console.log(`[${patch}] ${version} is up to date`);
      patches[patch] = cached;
      continue;
    }
    patches[patch] = { version, label: version, sets: await buildPatch(patch, version) };
  }

  // A b patch keeps the same client version, so labels are refreshed on every run.
  try {
    const labels = switcherLabels(
      await fetchTftPatches(),
      patches.latest.sets[0] ?? 0,
      patches.pbe.sets[0] ?? 0,
      Date.now(),
    );
    if (labels) for (const patch of PATCHES) patches[patch].label = labels[patch];
  } catch (error) {
    console.warn("Couldn't read Riot's patch notes; showing client versions instead.", error);
  }
  console.log(`labels: live ${patches.latest.label}, PBE ${patches.pbe.label}`);

  const manifest: Manifest = { generatedAt: new Date().toISOString(), patches };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifestSchema.parse(manifest), null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

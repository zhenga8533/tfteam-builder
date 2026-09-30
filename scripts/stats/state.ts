import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PatchCounters, PlatformState } from "./types.ts";

/**
 * On-disk layout of the `stats` branch:
 *   state/{platform}.json            player pool and last-crawl times
 *   seen/{platform}.txt              processed match IDs with their game time (epoch s)
 *   counters/set{N}/{patch}.json     additive counters per rank bucket
 */
export class StatsStore {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  private async readJson<T>(path: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(join(this.root, path), "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  private async write(path: string, contents: string) {
    const file = join(this.root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents);
  }

  async platformState(platform: string): Promise<PlatformState> {
    return (await this.readJson<PlatformState>(`state/${platform}.json`)) ?? { players: [] };
  }

  savePlatformState(platform: string, state: PlatformState) {
    return this.write(`state/${platform}.json`, JSON.stringify(state));
  }

  async seen(platform: string): Promise<Map<string, number>> {
    try {
      const text = await readFile(join(this.root, `seen/${platform}.txt`), "utf8");
      return new Map(
        text
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [id = "", time = "0"] = line.split("\t");
            return [id, Number(time)];
          }),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
      throw error;
    }
  }

  /** Match lists are only requested since each player's last crawl, so old IDs can be forgotten. */
  saveSeen(platform: string, seen: Map<string, number>, keepAfter: number) {
    const lines = [...seen].filter(([, time]) => time >= keepAfter).map(([id, time]) => `${id}\t${time}`);
    return this.write(`seen/${platform}.txt`, lines.join("\n") + "\n");
  }

  patchCounters(set: number, patch: string) {
    return this.readJson<PatchCounters>(`counters/set${set}/${patch}.json`);
  }

  savePatchCounters(counters: PatchCounters) {
    return this.write(`counters/set${counters.set}/${counters.patch}.json`, JSON.stringify(counters));
  }

  async listPatchCounters(): Promise<{ set: number; patch: string }[]> {
    const setDirs = await readdir(join(this.root, "counters")).catch(() => []);
    const entries = await Promise.all(
      setDirs.map(async (dir) => {
        const files = await readdir(join(this.root, "counters", dir));
        return files.map((file) => ({ set: Number(dir.replace("set", "")), patch: file.replace(/\.json$/, "") }));
      }),
    );
    return entries.flat();
  }

  /** Keeps the newest `keep` patches of each set; older patches are no longer shown on the site. */
  async prunePatches(keep: number) {
    const all = await this.listPatchCounters();
    const bySet = Map.groupBy(all, (entry) => entry.set);
    for (const [set, patches] of bySet) {
      const stale = patches.sort((a, b) => comparePatches(b.patch, a.patch)).slice(keep);
      for (const { patch } of stale) await rm(join(this.root, `counters/set${set}/${patch}.json`));
    }
  }
}

/** Numeric patch comparison, so `16.10` sorts after `16.9`. */
export function comparePatches(a: string, b: string) {
  const [aMajor = 0, aMinor = 0] = a.split(".").map(Number);
  const [bMajor = 0, bMinor = 0] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

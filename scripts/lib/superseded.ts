import type { BoardChunk, StatsStore } from "../stats/state.ts";
import type { BoardRow } from "../stats/types.ts";
import { patchAt, supersededPatches } from "./tft-patches.ts";

export interface SupersededCleanup {
  patches: string[];
  /** Board chunks filed under a superseded patch, and the patch folder each of their boards moves to. */
  moves: { from: string; to: string[] }[];
  /** Saved summaries, comps and counters of superseded patches. */
  deletes: string[];
}

/** A superseded patch's file in a per-patch folder: `{patch}.json` or `{patch}.json.gz`, at any rank floor. */
const fileOf = (key: string, patches: Set<string>) => {
  const name = key.slice(key.lastIndexOf("/") + 1).replace(/\.json(\.gz)?$/, "");
  return patches.has(name);
};

/** Boards identify themselves by match and placement, so merging two chunks never counts one twice. */
const boardId = (row: BoardRow) => `${row[0]}|${row[3]}`;

/**
 * Removes what patches replaced on their release day (see `supersededPatches`) left in the store. Their boards are
 * really the replacing patch's, filed early by the crawler, so they move to that patch's folder (merged into a chunk of
 * the same name there); their saved summaries, comps and counters are deleted. Without `apply` it only reports.
 */
export async function cleanUpSupersededPatches(store: StatsStore, apply: boolean): Promise<SupersededCleanup> {
  const timeline = await store.patchTimeline();
  const patches = supersededPatches(timeline);
  const result: SupersededCleanup = { patches: [...patches], moves: [], deletes: [] };
  if (patches.size === 0) return result;

  for (const chunk of (await store.listBoardChunks()).filter((entry) => patches.has(entry.patch))) {
    const rows = await store.readBoards(chunk);
    const byPatch = Map.groupBy(rows, (row) => patchAt(timeline, chunk.set, row[1] * 1000) ?? chunk.patch);
    // A board that still belongs here (no later patch covers its time) keeps the chunk where it is.
    if (byPatch.has(chunk.patch)) continue;
    result.moves.push({ from: chunk.key, to: [...byPatch.keys()] });
    if (!apply) continue;
    for (const [patch, moved] of byPatch) {
      const target: BoardChunk = { ...chunk, patch, key: `boards/set${chunk.set}/${patch}/${chunk.name}.jsonl.gz` };
      const existing = await store.readBoards(target);
      const seen = new Set(existing.map(boardId));
      await store.appendBoards(chunk.set, patch, chunk.name, [
        ...existing,
        ...moved.filter((row) => !seen.has(boardId(row))),
      ]);
    }
    await store.blobs.delete(chunk.key);
  }

  for (const prefix of ["summaries/", "comps/", "counters/"]) {
    for (const key of await store.blobs.list(prefix)) {
      if (!fileOf(key, patches)) continue;
      result.deletes.push(key);
      if (apply) await store.blobs.delete(key);
    }
  }
  return result;
}

import type { LittleLegend } from "../../src/lib/data/schema.ts";
import { addCounter, bump, type Counter, counterFor, statLine } from "../../src/lib/game/stat-line.ts";
import type { ResolvedBoard } from "./boards.ts";
import { CDRAGON_BASE } from "../data/cdragon.ts";

const COMPANIONS_URL = `${CDRAGON_BASE}/latest/plugins/rcp-be-lol-game-data/global/default/v1/companions.json`;
const GAME_DATA_ASSETS = "/lol-game-data/assets/";
const GAME_DATA_BASE = `${CDRAGON_BASE}/latest/plugins/rcp-be-lol-game-data/global/default/`;

export interface RawCompanion {
  contentId: string;
  name: string;
  speciesName: string;
  loadoutsIcon: string;
  companionType: string;
}

export interface Companion {
  name: string;
  species: string;
  icon: string;
  kind: LittleLegend["kind"];
}

/** CDragon's companion catalogue by content ID; client asset paths become (lowercased) CDragon URLs. */
export function companionCatalog(raw: RawCompanion[]): Map<string, Companion> {
  return new Map(
    raw.map((companion) => [
      companion.contentId,
      {
        name: companion.name,
        species: companion.speciesName,
        icon: GAME_DATA_BASE + companion.loadoutsIcon.replace(GAME_DATA_ASSETS, "").toLowerCase(),
        kind: companion.companionType === "kChibi" ? "chibi" : "legend",
      },
    ]),
  );
}

export async function fetchCompanions(): Promise<Map<string, Companion>> {
  const response = await fetch(COMPANIONS_URL);
  if (!response.ok) throw new Error(`Failed to load companions.json (${response.status})`);
  return companionCatalog((await response.json()) as RawCompanion[]);
}

/** Placements per Little Legend, for boards whose match recorded one. */
export class LittleLegendAccumulator {
  private readonly counters = new Map<string, Counter>();
  private boards = 0;

  get size() {
    return this.counters.size;
  }

  add(board: ResolvedBoard) {
    if (!board.companion) return;
    this.boards += 1;
    bump(counterFor(this.counters, board.companion), board.placement);
  }

  /**
   * One entry per Little Legend, most played first. A legend's star levels are separate content IDs with
   * the same name, so they count together, shown with the most played level's icon.
   */
  results(catalog: Map<string, Companion>): LittleLegend[] {
    const byName = new Map<string, { companion: Companion; counter: Counter; top: number }>();
    for (const [contentId, counter] of this.counters) {
      const companion = catalog.get(contentId);
      if (!companion) continue;
      const entry = byName.get(companion.name);
      if (!entry) {
        byName.set(companion.name, { companion, counter: [...counter] as Counter, top: counter[0] });
        continue;
      }
      addCounter(entry.counter, counter);
      if (counter[0] > entry.top) Object.assign(entry, { companion, top: counter[0] });
    }
    return [...byName.values()]
      .map(({ companion, counter }) => ({ ...companion, ...statLine(counter, this.boards) }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
  }
}

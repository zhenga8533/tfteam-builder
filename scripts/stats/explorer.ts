import type { ExplorerBoard } from "../../src/lib/explorer/format.ts";
import { TotalsAccumulator } from "../../src/lib/explorer/totals.ts";
import { RANK_BUCKETS, type RankBucket } from "../store/types.ts";
import type { ResolvedBoard } from "./boards.ts";

/** A growable list of non-negative integers, stored in a typed array: 16-bit for small values, else 32-bit. */
class NumberList {
  private values: Uint16Array | Uint32Array;
  length = 0;

  constructor(bits: 16 | 32 = 32) {
    this.values = bits === 16 ? new Uint16Array(16) : new Uint32Array(16);
  }

  push(value: number) {
    if (this.length === this.values.length) {
      const grown = new (this.values.constructor as Uint32ArrayConstructor)(this.values.length * 2);
      grown.set(this.values);
      this.values = grown;
    }
    this.values[this.length++] = value;
  }

  at(index: number) {
    return this.values[index]!;
  }
}

/** Names as small integers, so packed boards hold numbers rather than strings. */
class Dictionary {
  readonly names: string[] = [];
  private readonly indices = new Map<string, number>();

  index(name: string) {
    let index = this.indices.get(name);
    if (index === undefined) this.indices.set(name, (index = this.names.push(name) - 1));
    return index;
  }
}

/**
 * Every board, packed as numbers one after another: placement, level, rank, then a count and the entries of its units
 * (name, star, item count, items) and traits (name, breakpoint), each in 16 bits. A board as objects takes a couple
 * of kilobytes of memory; packed, about a hundred bytes.
 */
class BoardStore {
  private readonly words = new NumberList(16);
  private readonly starts = new NumberList();
  private readonly units = new Dictionary();
  private readonly items = new Dictionary();
  private readonly traits = new Dictionary();

  add(board: ExplorerBoard): number {
    const { words } = this;
    this.starts.push(words.length);
    words.push(board.placement);
    words.push(board.level);
    words.push(board.rank);
    words.push(board.units.length);
    for (const unit of board.units) {
      words.push(this.units.index(unit.apiName));
      words.push(unit.star);
      words.push(unit.items.length);
      for (const item of unit.items) words.push(this.items.index(item));
    }
    words.push(board.traits.length);
    for (const trait of board.traits) {
      words.push(this.traits.index(trait.apiName));
      words.push(trait.minUnits);
    }
    return this.starts.length - 1;
  }

  rank(id: number) {
    return this.words.at(this.starts.at(id) + 2);
  }

  get(id: number): ExplorerBoard {
    let at = this.starts.at(id);
    const next = () => this.words.at(at++);
    const board: ExplorerBoard = { placement: next(), level: next(), rank: next(), units: [], traits: [] };
    for (let units = next(); units > 0; units--) {
      const apiName = this.units.names[next()]!;
      const star = next();
      const items = Array.from({ length: next() }, () => this.items.names[next()]!);
      board.units.push({ apiName, star, items });
    }
    for (let traits = next(); traits > 0; traits--) {
      board.traits.push({ apiName: this.traits.names[next()]!, minUnits: next() });
    }
    return board;
  }
}

export interface ExplorerPart {
  kind: "champion" | "trait";
  apiName: string;
  /** An index into `RANK_BUCKETS`. */
  rank: number;
  boards: ExplorerBoard[];
}

/**
 * Sorts the Explorer's boards (see `EXPLORER_FILES`): each into the files of every champion and active trait on it,
 * by rank, and into the totals. Boards are kept packed until a file is written.
 */
export class ExplorerCollector {
  /** Boards per rank (an index into `RANK_BUCKETS`), so a champion's or trait's shares can be of the whole patch. */
  readonly population: number[] = RANK_BUCKETS.map(() => 0);
  readonly totals = new TotalsAccumulator();
  private readonly store = new BoardStore();
  /** Board IDs per champion and per trait. */
  private readonly files = { champion: new Map<string, NumberList>(), trait: new Map<string, NumberList>() };

  add(bucket: RankBucket, resolved: ResolvedBoard) {
    const rank = RANK_BUCKETS.indexOf(bucket);
    const board: ExplorerBoard = {
      placement: resolved.placement,
      level: resolved.level,
      rank,
      units: resolved.units,
      traits: resolved.traits.map(({ apiName, minUnits }) => ({ apiName, minUnits })),
    };
    this.population[rank]! += 1;
    this.totals.add(board);
    const id = this.store.add(board);
    for (const apiName of new Set(board.units.map((unit) => unit.apiName))) file(this.files.champion, apiName, id);
    for (const apiName of new Set(board.traits.map((trait) => trait.apiName))) file(this.files.trait, apiName, id);
  }

  /**
   * Every champion's and trait's boards at each of the first `ranks` ranks, one file's worth at a time, so only one
   * champion's or trait's boards are ever unpacked. A rank without boards still gets a part, so a missing file always
   * means something went wrong.
   */
  *parts(ranks: number): Generator<ExplorerPart> {
    for (const kind of ["champion", "trait"] as const) {
      for (const [apiName, ids] of this.files[kind]) {
        const byRank = Array.from({ length: ranks }, (): ExplorerBoard[] => []);
        for (let i = 0; i < ids.length; i++) {
          const id = ids.at(i);
          byRank[this.store.rank(id)]?.push(this.store.get(id));
        }
        for (const [rank, boards] of byRank.entries()) yield { kind, apiName, rank, boards };
      }
    }
  }
}

function file(files: Map<string, NumberList>, apiName: string, id: number) {
  let ids = files.get(apiName);
  if (!ids) files.set(apiName, (ids = new NumberList()));
  ids.push(id);
}

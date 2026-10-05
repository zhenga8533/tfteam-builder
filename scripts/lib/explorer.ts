import type { ExplorerBoard } from "../../src/lib/explorer/format.ts";
import { TotalsAccumulator } from "../../src/lib/explorer/totals.ts";
import { RANK_BUCKETS, type RankBucket } from "../stats/types.ts";
import type { ResolvedBoard } from "./boards.ts";

/**
 * Sorts the Explorer's boards (see `EXPLORER_FILES`), fed newest first: every board into the file of each champion
 * and active trait on it and into the totals, and the newest of each rank into the sample until that rank's quota
 * (see `explorerQuotas`) is filled.
 */
export class ExplorerCollector {
  /** Boards per rank (an index into `RANK_BUCKETS`), so a champion's or trait's shares can be of the whole patch. */
  readonly population: number[] = RANK_BUCKETS.map(() => 0);
  readonly sample: ExplorerBoard[] = [];
  readonly champions = new Map<string, ExplorerBoard[]>();
  readonly traits = new Map<string, ExplorerBoard[]>();
  readonly totals = new TotalsAccumulator();

  constructor(private readonly quotas: Map<RankBucket, number>) {}

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
    const left = this.quotas.get(bucket) ?? 0;
    if (left > 0) {
      this.quotas.set(bucket, left - 1);
      this.sample.push(board);
    }
    for (const apiName of new Set(board.units.map((unit) => unit.apiName))) file(this.champions, apiName, board);
    for (const apiName of new Set(board.traits.map((trait) => trait.apiName))) file(this.traits, apiName, board);
  }
}

function file(files: Map<string, ExplorerBoard[]>, apiName: string, board: ExplorerBoard) {
  const boards = files.get(apiName);
  if (boards) boards.push(board);
  else files.set(apiName, [board]);
}

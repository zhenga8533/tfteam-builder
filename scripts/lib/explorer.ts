import type { ExplorerBoard } from "../../src/lib/explorer/format.ts";
import { RANK_BUCKETS, type RankBucket } from "../stats/types.ts";
import type { ResolvedBoard } from "./boards.ts";

/**
 * Sorts the Explorer's boards, fed newest first: every board into the shard of each champion on it, and the newest
 * of each rank into the sample until that rank's quota (see `explorerQuotas`) is filled. The sample serves queries
 * without a champion; a query with one reads that champion's shard, which holds all of their boards.
 */
export class ExplorerCollector {
  /** Boards per rank (an index into `RANK_BUCKETS`), so shard shares can be of the whole patch. */
  readonly population: number[] = RANK_BUCKETS.map(() => 0);
  readonly sample: ExplorerBoard[] = [];
  readonly shards = new Map<string, ExplorerBoard[]>();

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
    const left = this.quotas.get(bucket) ?? 0;
    if (left > 0) {
      this.quotas.set(bucket, left - 1);
      this.sample.push(board);
    }
    for (const apiName of new Set(board.units.map((unit) => unit.apiName))) {
      const shard = this.shards.get(apiName);
      if (shard) shard.push(board);
      else this.shards.set(apiName, [board]);
    }
  }
}

import type { TrackedPlayer } from "./types.ts";

/**
 * A pool sorted least recently crawled first. Players crawled equally recently (all of a new pool) are spread out in
 * proportion to their tier's size rather than left in pool order (tier by tier), so a run that ends early still
 * covers every tier at its share.
 */
function byRecency(pool: TrackedPlayer[]): TrackedPlayer[] {
  const sizes = Map.groupBy(pool, (player) => player.bucket);
  const seen = new Map<string, number>();
  // How far through its own tier each player is (0 to 1); sorting on it interleaves the tiers proportionally.
  const position = new Map(
    pool.map((player) => {
      const index = seen.get(player.bucket) ?? 0;
      seen.set(player.bucket, index + 1);
      return [player, (index + 0.5) / sizes.get(player.bucket)!.length];
    }),
  );
  return [...pool].sort(
    (a, b) => (a.lastCrawledAt ?? 0) - (b.lastCrawledAt ?? 0) || position.get(a)! - position.get(b)!,
  );
}

/** The order to crawl a region's players: each platform least recently crawled first, platforms alternating. */
export function crawlOrder(pools: TrackedPlayer[][]): TrackedPlayer[] {
  const queues = pools.map(byRecency);
  const order: TrackedPlayer[] = [];
  for (let i = 0; queues.some((queue) => i < queue.length); i++) {
    for (const queue of queues) if (queue[i]) order.push(queue[i]!);
  }
  return order;
}

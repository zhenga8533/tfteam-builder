import { describe, expect, it } from "vitest";
import { crawlOrder } from "./crawl-order.ts";
import type { RankBucket, TrackedPlayer } from "./types.ts";

const players = (bucket: RankBucket, count: number, lastCrawledAt?: number): TrackedPlayer[] =>
  Array.from({ length: count }, (_, i) => ({ puuid: `${bucket}${i}`, bucket, lastCrawledAt }));

describe("crawlOrder", () => {
  it("spreads a new pool's tiers in proportion to their size", () => {
    const pool = [...players("master_plus", 4), ...players("diamond", 4), ...players("emerald", 2)];
    const firstHalf = crawlOrder([pool]).slice(0, 5);
    const count = (bucket: RankBucket) => firstHalf.filter((player) => player.bucket === bucket).length;
    expect([count("master_plus"), count("diamond"), count("emerald")]).toEqual([2, 2, 1]);
  });

  it("still puts the least recently crawled first", () => {
    const pool = [...players("master_plus", 2, 100), ...players("emerald", 1, 50), ...players("diamond", 1)];
    expect(crawlOrder([pool]).map((player) => player.puuid)).toEqual([
      "diamond0",
      "emerald0",
      "master_plus0",
      "master_plus1",
    ]);
  });

  it("alternates between platforms", () => {
    const order = crawlOrder([players("diamond", 2), [{ puuid: "x", bucket: "diamond" }]]);
    expect(order.map((player) => player.puuid)).toEqual(["diamond0", "x", "diamond1"]);
  });
});

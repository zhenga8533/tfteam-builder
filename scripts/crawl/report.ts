import { RANK_BUCKETS, type RankBucket } from "../store/types.ts";

export interface RegionResult {
  region: string;
  /** Undefined when the region failed. */
  players?: number;
  fetched?: number;
  kept?: number;
  byBucket?: Partial<Record<RankBucket, number>>;
  error?: string;
}

export interface CrawlReport {
  minutesUsed: number;
  budgetMinutes: number;
  regions: RegionResult[];
  /** Each platform's player pool by tier. */
  pools: { platform: string; byBucket: Partial<Record<RankBucket, number>> }[];
  /** New boards per set and patch, e.g. `["set 18 patch 18.3b", 27264]`. */
  newBoards: [label: string, boards: number][];
}

const BUCKET_LABEL: Record<RankBucket, string> = {
  master_plus: "Master+",
  diamond: "Diamond",
  emerald: "Emerald",
  platinum: "Platinum",
  gold: "Gold",
};

const count = (value: number) => value.toLocaleString("en-US");

/** Tiers that appear anywhere in the report, highest first. */
const bucketsIn = (rows: Partial<Record<RankBucket, number>>[]) =>
  RANK_BUCKETS.filter((bucket) => rows.some((row) => row[bucket]));

/** The crawl's summary as Markdown, for the Actions run page. */
export function renderCrawlReport({ minutesUsed, budgetMinutes, regions, pools, newBoards }: CrawlReport): string {
  const lines = [
    "## Crawl",
    "",
    `Used ${Math.round(minutesUsed)} of ${budgetMinutes} minutes` +
      // Finishing well early means every tracked player was checked: the pools, not the key, limit how much is crawled.
      (minutesUsed < budgetMinutes * 0.75 ? ", finishing early: larger player pools would collect more." : "."),
  ];

  const kept = regions.flatMap((region) => (region.byBucket ? [region.byBucket] : []));
  const keptBuckets = bucketsIn(kept);
  lines.push(
    "",
    `| Region | Players checked | Games fetched | Kept | ${keptBuckets.map((bucket) => BUCKET_LABEL[bucket]).join(" | ")} |`,
    `| --- | ---: | ---: | ---: |${" ---: |".repeat(keptBuckets.length)}`,
  );
  for (const region of regions) {
    if (region.error !== undefined) {
      lines.push(`| ${region.region} | ⚠️ failed: ${region.error} |`);
      continue;
    }
    const tiers = keptBuckets.map((bucket) => count(region.byBucket?.[bucket] ?? 0));
    lines.push(
      `| ${region.region} | ${count(region.players ?? 0)} | ${count(region.fetched ?? 0)} | ${count(region.kept ?? 0)} | ${tiers.join(" | ")} |`,
    );
  }

  const poolBuckets = bucketsIn(pools.map((pool) => pool.byBucket));
  lines.push(
    "",
    "Player pools by tier:",
    "",
    `| Platform | ${poolBuckets.map((bucket) => BUCKET_LABEL[bucket]).join(" | ")} |`,
    `| --- |${" ---: |".repeat(poolBuckets.length)}`,
  );
  for (const pool of pools) {
    lines.push(`| ${pool.platform} | ${poolBuckets.map((bucket) => count(pool.byBucket[bucket] ?? 0)).join(" | ")} |`);
  }

  lines.push("");
  if (newBoards.length === 0) lines.push("No new boards.");
  for (const [label, boards] of newBoards) lines.push(`- ${label}: ${count(boards)} new boards`);
  return [...lines, ""].join("\n");
}

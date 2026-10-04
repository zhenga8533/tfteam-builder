import { appendFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fetchTftPatches, mergeTimelines, patchAt } from "../lib/tft-patches.ts";
import { isRankedStandard, matchToRows } from "./aggregate.ts";
import { type Platform, REGIONAL_HOSTS, type RegionalHost, selectPlatforms } from "./regions.ts";
import { renderCrawlReport } from "./crawl-report.ts";
import { ApiKeyRejectedError, BudgetExceededError, RiotClient } from "./riot.ts";
import { seedPlayers } from "./seed.ts";
import { createStatsStore, runStamp } from "./state.ts";
import { type BoardRow, RANK_BUCKETS, type RankBucket, type TrackedPlayer } from "./types.ts";

const HOUR = 3600;
const DAY = 24 * HOUR;

const { values: args } = parseArgs({
  options: {
    state: { type: "string" },
    "budget-minutes": { type: "string", default: "45" },
    platforms: { type: "string" },
    "max-matches": { type: "string" },
    "min-tier": { type: "string", default: "gold" },
    "reseed-hours": { type: "string", default: "24" },
    "lookback-days": { type: "string", default: "2" },
    "dry-run": { type: "boolean", default: false },
  },
});

const isBucket = (value: string): value is RankBucket => RANK_BUCKETS.includes(value as RankBucket);

interface RegionSummary {
  players: number;
  fetched: number;
  kept: number;
  byBucket: Partial<Record<RankBucket, number>>;
}

async function main() {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY is not set");
  const minBucket = args["min-tier"];
  if (!isBucket(minBucket)) throw new Error(`--min-tier must be one of ${RANK_BUCKETS.join(", ")}`);

  const startedAt = Date.now();
  const nowSeconds = Math.floor(startedAt / 1000);
  const client = new RiotClient({ apiKey, deadline: startedAt + Number(args["budget-minutes"]) * 60_000 });
  const store = createStatsStore(args.state);
  if (!store) throw new Error("Set the R2_* environment variables or pass --state <dir>");
  const platforms = selectPlatforms(args.platforms?.split(","));
  const maxMatches = args["max-matches"] ? Number(args["max-matches"]) : Infinity;

  const states = new Map(
    await Promise.all(platforms.map(async (p) => [p.id, await store.platformState(p.id)] as const)),
  );
  const seen = new Map(await Promise.all(platforms.map(async (p) => [p.id, await store.seen(p.id)] as const)));
  /** New boards by `set/patch`, per region, written as one chunk each at the end of the run. */
  const boards = new Map<RegionalHost, Map<string, BoardRow[]>>();

  // Match data doesn't report the patch, so matches are assigned to the TFT patch live when they were
  // played, from Riot's patch notes. If those can't be read, the last known timeline is used.
  let timeline = await store.patchTimeline();
  try {
    timeline = mergeTimelines(timeline, await fetchTftPatches());
  } catch (error) {
    if (timeline.length === 0) throw error;
    console.warn("Couldn't read Riot's patch notes; using the last known patch timeline.", error);
  }

  // Seeding hits platform hosts, which have their own rate limits, so all platforms seed in parallel.
  await Promise.all(
    platforms.map(async (platform) => {
      const state = states.get(platform.id)!;
      const age = state.seededAt ? nowSeconds - Date.parse(state.seededAt) / 1000 : Infinity;
      if (age < Number(args["reseed-hours"]) * HOUR && state.players.length) return;
      try {
        state.players = await seedPlayers(client, platform, minBucket, state.players);
        state.seededAt = new Date(startedAt).toISOString();
      } catch (error) {
        if (!(error instanceof BudgetExceededError)) throw error;
      }
    }),
  );

  /** Least recently crawled players first, alternating between the region's platforms. */
  const crawlOrder = (regionPlatforms: Platform[]) => {
    const queues = regionPlatforms.map((platform) =>
      [...states.get(platform.id)!.players].sort((a, b) => (a.lastCrawledAt ?? 0) - (b.lastCrawledAt ?? 0)),
    );
    const order: TrackedPlayer[] = [];
    for (let i = 0; queues.some((queue) => i < queue.length); i++) {
      for (const queue of queues) if (queue[i]) order.push(queue[i]!);
    }
    return order;
  };

  const crawlRegion = async (region: RegionalHost): Promise<RegionSummary> => {
    const summary: RegionSummary = { players: 0, fetched: 0, kept: 0, byBucket: {} };
    const regionPlatforms = platforms.filter((platform) => platform.region === region);
    const regionBoards = new Map<string, BoardRow[]>();
    boards.set(region, regionBoards);
    try {
      for (const player of crawlOrder(regionPlatforms)) {
        if (summary.fetched >= maxMatches) break;
        const ids = await client.matchIds(
          region,
          player.puuid,
          player.lastCrawledAt ?? nowSeconds - Number(args["lookback-days"]) * DAY,
        );
        for (const id of ids ?? []) {
          const platformSeen = seen.get(id.split("_")[0]!.toLowerCase());
          if (!platformSeen || platformSeen.has(id)) continue;
          const match = await client.match(region, id);
          summary.fetched += 1;
          platformSeen.set(id, match ? Math.floor(match.info.game_datetime / 1000) : nowSeconds);
          const patch = match && patchAt(timeline, match.info.tft_set_number, match.info.game_datetime);
          if (!match || !patch || !isRankedStandard(match)) continue;
          const key = `${match.info.tft_set_number}/${patch}`;
          const rows = regionBoards.get(key) ?? [];
          rows.push(...matchToRows(match, player.bucket));
          regionBoards.set(key, rows);
          summary.kept += 1;
          summary.byBucket[player.bucket] = (summary.byBucket[player.bucket] ?? 0) + 1;
        }
        player.lastCrawledAt = nowSeconds;
        summary.players += 1;
      }
    } catch (error) {
      if (!(error instanceof BudgetExceededError)) throw error;
    }
    return summary;
  };

  const regions = REGIONAL_HOSTS.filter((region) => platforms.some((platform) => platform.region === region));
  const results = await Promise.allSettled(regions.map(crawlRegion));

  // Boards collected before a region failed are still written, alongside the state that skips them next time.
  if (!args["dry-run"]) {
    const stamp = runStamp(new Date(startedAt));
    for (const [region, regionBoards] of boards) {
      for (const [key, rows] of regionBoards) {
        const [set, patch] = key.split("/");
        await store.appendBoards(Number(set), patch!, `${stamp}-${region}`, rows);
      }
    }
    for (const platform of platforms) {
      await store.savePlatformState(platform.id, states.get(platform.id)!);
      await store.saveSeen(platform.id, seen.get(platform.id)!, nowSeconds - 10 * DAY);
    }
    await store.savePatchTimeline(timeline);
    await store.pruneBoards(2);
  }

  results.forEach((result, index) => {
    const region = regions[index];
    if (result.status === "fulfilled") {
      const { players, fetched, kept, byBucket } = result.value;
      console.log(`[${region}] ${players} players, ${fetched} matches fetched, ${kept} kept`, byBucket);
    } else {
      console.error(`[${region}] failed:`, result.reason);
    }
  });
  for (const platform of platforms) {
    const pool = states.get(platform.id)!.players;
    const buckets = Object.groupBy(pool, (player) => player.bucket);
    const counts = Object.fromEntries(Object.entries(buckets).map(([bucket, players]) => [bucket, players!.length]));
    console.log(`[${platform.id}] pool ${pool.length}`, counts);
  }
  const newBoards = Map.groupBy(
    [...boards.values()].flatMap((regionBoards) => [...regionBoards]),
    ([key]) => key,
  );
  for (const [key, entries] of newBoards) {
    const count = entries.reduce((total, [, rows]) => total + rows.length, 0);
    console.log(`set ${key.replace("/", " patch ")}: ${count} new boards`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = renderCrawlReport({
      minutesUsed: (Date.now() - startedAt) / 60_000,
      budgetMinutes: Number(args["budget-minutes"]),
      regions: results.map((result, index) =>
        result.status === "fulfilled"
          ? { region: regions[index]!, ...result.value }
          : {
              region: regions[index]!,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            },
      ),
      pools: platforms.map((platform) => ({
        platform: platform.id,
        byBucket: Object.fromEntries(
          Object.entries(Object.groupBy(states.get(platform.id)!.players, (player) => player.bucket)).map(
            ([bucket, players]) => [bucket, players!.length],
          ),
        ),
      })),
      newBoards: [...newBoards].map(([key, entries]) => [
        `set ${key.replace("/", " patch ")}`,
        entries.reduce((total, [, rows]) => total + rows.length, 0),
      ]),
    });
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  // The key is shared by every region, so a rejected key fails the run with its own message. Otherwise one region's
  // outage shouldn't discard the others' progress or block the deploy; only fail when nothing worked.
  const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason as unknown] : []));
  const rejectedKey = failures.find((reason) => reason instanceof ApiKeyRejectedError);
  if (rejectedKey) throw rejectedKey;
  if (failures.length && failures.length === results.length) throw failures[0];
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

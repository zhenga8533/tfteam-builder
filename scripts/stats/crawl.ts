import { parseArgs } from "node:util";
import { fetchVersion, patchLabel } from "../lib/cdragon.ts";
import { addToPatch, isRankedStandard, patchForMatch, recordPatch } from "./aggregate.ts";
import { type Platform, REGIONAL_HOSTS, type RegionalHost, selectPlatforms } from "./regions.ts";
import { BudgetExceededError, RiotClient } from "./riot.ts";
import { seedPlayers } from "./seed.ts";
import { StatsStore } from "./state.ts";
import { type PatchCounters, RANK_BUCKETS, type RankBucket, type TrackedPlayer } from "./types.ts";

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
  if (!args.state) throw new Error("--state <dir> is required");
  const minBucket = args["min-tier"];
  if (!isBucket(minBucket)) throw new Error(`--min-tier must be one of ${RANK_BUCKETS.join(", ")}`);

  const startedAt = Date.now();
  const nowSeconds = Math.floor(startedAt / 1000);
  const client = new RiotClient({ apiKey, deadline: startedAt + Number(args["budget-minutes"]) * 60_000 });
  const store = new StatsStore(args.state);
  const platforms = selectPlatforms(args.platforms?.split(","));
  const maxMatches = args["max-matches"] ? Number(args["max-matches"]) : Infinity;

  const states = new Map(
    await Promise.all(platforms.map(async (p) => [p.id, await store.platformState(p.id)] as const)),
  );
  const seen = new Map(await Promise.all(platforms.map(async (p) => [p.id, await store.seen(p.id)] as const)));
  const patches = new Map<string, PatchCounters>();

  // Match data doesn't report the patch, so remember when each live patch was first seen.
  let timeline = await store.patchTimeline();
  try {
    timeline = recordPatch(timeline, patchLabel(await fetchVersion("latest")), startedAt);
  } catch (error) {
    if (timeline.length === 0) throw error;
    console.warn("Couldn't read the live patch from CommunityDragon; using the last known patch.", error);
  }

  const patchCounters = async (set: number, patch: string) => {
    const key = `${set}/${patch}`;
    let counters = patches.get(key);
    if (!counters) {
      counters = (await store.patchCounters(set, patch)) ?? { set, patch, updatedAt: "", buckets: {} };
      patches.set(key, counters);
    }
    return counters;
  };

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
          const patch = match && patchForMatch(match, timeline);
          if (!match || !patch || !isRankedStandard(match)) continue;
          addToPatch(await patchCounters(match.info.tft_set_number, patch), player.bucket, match);
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

  if (!args["dry-run"]) {
    const updatedAt = new Date().toISOString();
    for (const platform of platforms) {
      await store.savePlatformState(platform.id, states.get(platform.id)!);
      await store.saveSeen(platform.id, seen.get(platform.id)!, nowSeconds - 10 * DAY);
    }
    for (const counters of patches.values()) await store.savePatchCounters({ ...counters, updatedAt });
    await store.prunePatches(2);
    await store.savePatchTimeline(timeline);
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
  for (const counters of patches.values()) {
    const games = Object.values(counters.buckets).reduce((total, bucket) => total + bucket.matches, 0);
    console.log(`set ${counters.set} patch ${counters.patch}: ${games} matches total`);
  }

  // One region's outage shouldn't discard the others' progress or block the deploy; only fail
  // when nothing worked (e.g. an invalid or expired API key).
  const failure = results.find((result) => result.status === "rejected");
  if (failure && results.every((result) => result.status === "rejected")) throw failure.reason;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

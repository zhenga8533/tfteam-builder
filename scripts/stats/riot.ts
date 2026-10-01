import type { RegionalHost } from "./regions.ts";
import type { LeagueEntry, LeagueList, Match } from "./types.ts";

export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Thrown when waiting for rate-limit capacity would run past the crawl's time budget. */
export class BudgetExceededError extends Error {
  constructor() {
    super("Crawl time budget exhausted");
  }
}

/** `"20:1,100:120"` → `[[20, 1], [100, 120]]` (requests per seconds). */
export const parseRateLimitHeader = (header: string | null): [number, number][] =>
  (header ?? "")
    .split(",")
    .map((part) => part.split(":").map(Number) as [number, number])
    .filter(([limit, seconds]) => limit > 0 && seconds > 0);

// Riot measures windows on its side; a small margin avoids 429s from clock and latency drift.
const WINDOW_MARGIN_MS = 100;

/** Sliding-window limiter enforcing several windows at once (e.g. 20/1s and 100/2min). */
export class RateLimiter {
  private windows: { limit: number; ms: number; hits: number[] }[] = [];
  private blockedUntil = 0;
  private readonly clock: Clock;

  constructor(spec: [number, number][], clock: Clock) {
    this.clock = clock;
    this.setLimits(spec);
  }

  setLimits(spec: [number, number][]) {
    const hits = this.windows.flatMap((window) => window.hits);
    this.windows = spec.map(([limit, seconds]) => ({
      limit,
      ms: seconds * 1000 + WINDOW_MARGIN_MS,
      hits: [...new Set(hits)].sort((a, b) => a - b),
    }));
  }

  block(untilMs: number) {
    this.blockedUntil = Math.max(this.blockedUntil, untilMs);
  }

  /** Waits until every window has capacity, then records a request. */
  async acquire(deadline = Infinity) {
    for (;;) {
      const now = this.clock.now();
      let wait = Math.max(0, this.blockedUntil - now);
      for (const window of this.windows) {
        while (window.hits.length && window.hits[0]! <= now - window.ms) window.hits.shift();
        if (window.hits.length >= window.limit) wait = Math.max(wait, window.hits[0]! + window.ms - now);
      }
      if (wait === 0) {
        for (const window of this.windows) window.hits.push(now);
        return;
      }
      if (now + wait > deadline) throw new BudgetExceededError();
      await this.clock.sleep(wait);
    }
  }
}

/** Personal and development keys share these app limits; responses refine them. */
const DEFAULT_APP_LIMITS: [number, number][] = [
  [20, 1],
  [100, 120],
];
const MAX_ATTEMPTS = 5;

interface RiotClientOptions {
  apiKey: string;
  clock?: Clock;
  /** Epoch ms after which no new request is started. */
  deadline?: number;
  fetch?: typeof fetch;
}

export class RiotClient {
  private readonly limiters = new Map<string, RateLimiter>();
  private readonly apiKey: string;
  private readonly clock: Clock;
  private readonly deadline: number;
  private readonly fetch: typeof fetch;

  constructor({ apiKey, clock = systemClock, deadline = Infinity, fetch: fetchImpl = fetch }: RiotClientOptions) {
    this.apiKey = apiKey;
    this.clock = clock;
    this.deadline = deadline;
    this.fetch = fetchImpl;
  }

  private limiter(key: string, defaults: [number, number][]) {
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new RateLimiter(defaults, this.clock);
      this.limiters.set(key, limiter);
    }
    return limiter;
  }

  /**
   * GET with app-level (per host) and method-level (per host and endpoint) rate limiting.
   * Returns null for 404s, which Riot uses for "no such player/match".
   */
  async get<T>(host: string, path: string, method: string): Promise<T | null> {
    const app = this.limiter(host, DEFAULT_APP_LIMITS);
    const endpoint = this.limiter(`${host} ${method}`, []);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await app.acquire(this.deadline);
      await endpoint.acquire(this.deadline);
      let response: Response;
      try {
        response = await this.fetch(`https://${host}.api.riotgames.com${path}`, {
          headers: { "X-Riot-Token": this.apiKey },
        });
      } catch (error) {
        // Connection resets and timeouts are transient; treat them like a 5xx.
        if (attempt === MAX_ATTEMPTS - 1) throw error;
        await this.clock.sleep(2 ** attempt * 1000);
        continue;
      }

      const appLimits = parseRateLimitHeader(response.headers.get("X-App-Rate-Limit"));
      if (appLimits.length) app.setLimits(appLimits);
      const methodLimits = parseRateLimitHeader(response.headers.get("X-Method-Rate-Limit"));
      if (methodLimits.length) endpoint.setLimits(methodLimits);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 5) * 1000;
        const until = this.clock.now() + retryAfter;
        (response.headers.get("X-Rate-Limit-Type") === "method" ? endpoint : app).block(until);
        continue;
      }
      if (response.status === 404) return null;
      if (response.status >= 500) {
        await this.clock.sleep(2 ** attempt * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`GET ${host}${path} failed: ${response.status}`);
      return (await response.json()) as T;
    }
    throw new Error(`GET ${host}${path} failed after ${MAX_ATTEMPTS} attempts`);
  }

  apexLeague(platform: string, tier: "challenger" | "grandmaster" | "master") {
    return this.get<LeagueList>(platform, `/tft/league/v1/${tier}?queue=RANKED_TFT`, `league-${tier}`);
  }

  leagueEntries(platform: string, tier: string, division: string, page: number) {
    return this.get<LeagueEntry[]>(
      platform,
      `/tft/league/v1/entries/${tier}/${division}?queue=RANKED_TFT&page=${page}`,
      "league-entries",
    );
  }

  matchIds(region: RegionalHost, puuid: string, startTime: number, count = 20) {
    return this.get<string[]>(
      region,
      `/tft/match/v1/matches/by-puuid/${puuid}/ids?startTime=${startTime}&count=${count}`,
      "match-ids",
    );
  }

  match(region: RegionalHost, matchId: string) {
    return this.get<Match>(region, `/tft/match/v1/matches/${matchId}`, "match");
  }
}

import { describe, expect, it } from "vitest";
import {
  ApiKeyRejectedError,
  BudgetExceededError,
  type Clock,
  parseRateLimitHeader,
  RateLimiter,
  RiotClient,
} from "./riot.ts";

function fakeClock(start = 0): Clock & { time: number } {
  const clock = {
    time: start,
    now: () => clock.time,
    sleep: async (ms: number) => {
      clock.time += ms;
    },
  };
  return clock;
}

describe("RateLimiter", () => {
  it("waits for the tightest window and blocks after a 429", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(
      [
        [2, 1],
        [3, 10],
      ],
      clock,
    );
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire(); // 1s window full → waits ~1s
    expect(clock.time).toBeGreaterThanOrEqual(1000);
    await limiter.acquire(); // 10s window full → waits until the first hit expires
    expect(clock.time).toBeGreaterThanOrEqual(10_000);

    limiter.block(clock.time + 5000);
    const before = clock.time;
    await limiter.acquire();
    expect(clock.time - before).toBeGreaterThanOrEqual(5000);
  });

  it("refuses to wait past the deadline", async () => {
    const limiter = new RateLimiter([[1, 60]], fakeClock());
    await limiter.acquire(1000);
    await expect(limiter.acquire(1000)).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("parses Riot rate limit headers", () => {
    expect(parseRateLimitHeader("20:1,100:120")).toEqual([
      [20, 1],
      [100, 120],
    ]);
    expect(parseRateLimitHeader(null)).toEqual([]);
  });
});

describe("RiotClient", () => {
  it("retries after a 429 using Retry-After and returns null for 404", async () => {
    const clock = fakeClock();
    const responses = [
      new Response(null, { status: 429, headers: { "Retry-After": "3" } }),
      new Response(JSON.stringify(["NA1_1"]), { status: 200, headers: { "X-App-Rate-Limit": "20:1,100:120" } }),
      new Response(null, { status: 404 }),
    ];
    const client = new RiotClient({ apiKey: "key", clock, fetch: async () => responses.shift()! });

    expect(await client.matchIds("americas", "puuid", 0)).toEqual(["NA1_1"]);
    expect(clock.time).toBeGreaterThanOrEqual(3000);
    expect(await client.match("americas", "NA1_404")).toBeNull();
  });

  it("explains a rejected (e.g. expired) key instead of retrying", async () => {
    let calls = 0;
    const client = new RiotClient({
      apiKey: "expired",
      clock: fakeClock(),
      fetch: async () => {
        calls += 1;
        return new Response(null, { status: 403 });
      },
    });
    await expect(client.match("americas", "NA1_1")).rejects.toThrow(ApiKeyRejectedError);
    await expect(client.match("americas", "NA1_1")).rejects.toThrow(/RIOT_API_KEY/);
    expect(calls).toBe(2);
  });
});

describe("RiotClient network errors", () => {
  it("retries connection failures with backoff", async () => {
    const clock = fakeClock();
    let calls = 0;
    const client = new RiotClient({
      apiKey: "key",
      clock,
      fetch: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("fetch failed");
        return new Response(JSON.stringify([]), { status: 200 });
      },
    });
    expect(await client.matchIds("americas", "puuid", 0)).toEqual([]);
    expect(calls).toBe(2);
  });
});

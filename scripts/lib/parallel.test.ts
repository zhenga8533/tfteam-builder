import { describe, expect, it } from "vitest";
import { forEachConcurrently } from "./parallel.ts";

describe("forEachConcurrently", () => {
  it("runs every item, never more than the limit at once", async () => {
    let running = 0;
    let most = 0;
    const done: number[] = [];
    await forEachConcurrently([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
      most = Math.max(most, ++running);
      await new Promise((resolve) => setTimeout(resolve, item % 3));
      done.push(item);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(most).toBe(3);
  });

  it("rejects when a task fails", async () => {
    await expect(
      forEachConcurrently([1, 2], 2, async (item) => {
        if (item === 2) throw new Error("upload failed");
      }),
    ).rejects.toThrow("upload failed");
  });
});

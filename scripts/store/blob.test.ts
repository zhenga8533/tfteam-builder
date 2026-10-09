import { describe, expect, it } from "vitest";
import { type BlobStore, CachingBlobStore } from "./blob.ts";

class CountingStore implements BlobStore {
  gets = 0;
  data = new Map<string, Uint8Array>([
    ["boards/a", new Uint8Array([1])],
    ["state/x", new Uint8Array([2])],
  ]);
  async get(key: string) {
    this.gets += 1;
    return this.data.get(key) ?? null;
  }
  async put(key: string, data: Uint8Array | string) {
    this.data.set(key, typeof data === "string" ? new TextEncoder().encode(data) : data);
  }
  async list(prefix: string) {
    return [...this.data.keys()].filter((key) => key.startsWith(prefix));
  }
  async delete(key: string) {
    this.data.delete(key);
  }
}

describe("CachingBlobStore", () => {
  it("reads each cached key once and leaves other keys uncached", async () => {
    const inner = new CountingStore();
    const store = new CachingBlobStore(inner, "boards/");
    await store.get("boards/a");
    await store.get("boards/a");
    await store.get("boards/missing");
    await store.get("boards/missing");
    expect(inner.gets).toBe(2);
    await store.get("state/x");
    await store.get("state/x");
    expect(inner.gets).toBe(4);
  });

  it("drops a cached copy when the key is written", async () => {
    const inner = new CountingStore();
    const store = new CachingBlobStore(inner, "boards/");
    await store.get("boards/a");
    await store.put("boards/a", new Uint8Array([9]));
    expect(await store.get("boards/a")).toEqual(new Uint8Array([9]));
  });
});

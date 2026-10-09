import { describe, expect, it } from "vitest";
import { R2BlobStore } from "./r2.ts";

describe("R2BlobStore", () => {
  const config = { accountId: "acct", accessKeyId: "id", secretAccessKey: "secret", bucket: "tft" };

  it("signs requests against the bucket and follows list pagination", async () => {
    const requests: Request[] = [];
    const pages = [
      "<ListBucketResult><Key>boards/a&amp;b.gz</Key><IsTruncated>true</IsTruncated><NextContinuationToken>t2</NextContinuationToken></ListBucketResult>",
      "<ListBucketResult><Key>boards/c.gz</Key><IsTruncated>false</IsTruncated></ListBucketResult>",
    ];
    const store = new R2BlobStore(config, async (input) => {
      const request = input as Request;
      requests.push(request);
      if (request.method === "GET" && new URL(request.url).searchParams.has("list-type")) {
        return new Response(pages.shift());
      }
      return new Response(null, { status: request.method === "GET" ? 404 : 200 });
    });

    expect(await store.list("boards/")).toEqual(["boards/a&b.gz", "boards/c.gz"]);
    expect(new URL(requests[1]!.url).searchParams.get("continuation-token")).toBe("t2");
    expect(await store.get("state/na1.json")).toBeNull();
    await store.put("state/na1.json", "{}");

    const put = requests.at(-1)!;
    expect(put.url).toBe("https://acct.r2.cloudflarestorage.com/tft/state/na1.json");
    expect(put.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=id\//);

    await store.put("1/set18/explorer/totals.json", "{}", { "Content-Type": "application/json" });
    expect(requests.at(-1)!.headers.get("content-type")).toBe("application/json");
  });

  it("fails on client errors instead of retrying", async () => {
    let calls = 0;
    const store = new R2BlobStore(config, async () => {
      calls += 1;
      return new Response("denied", { status: 403 });
    });
    await expect(store.put("x", "y")).rejects.toThrow(/403/);
    expect(calls).toBe(1);
  });
});

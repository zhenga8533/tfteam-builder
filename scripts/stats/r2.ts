import { AwsClient } from "aws4fetch";
import type { BlobStore } from "./blob.ts";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Reads R2 credentials from `R2_*` environment variables; null unless all four are set. */
export function r2ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
  };
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const MAX_ATTEMPTS = 4;

/** Cloudflare R2 through its S3-compatible API, signed with AWS SigV4. */
export class R2BlobStore implements BlobStore {
  private readonly signer: AwsClient;
  private readonly base: string;
  private readonly fetch: typeof fetch;

  constructor(config: R2Config, fetchImpl: typeof fetch = fetch) {
    this.signer = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    this.base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
    this.fetch = fetchImpl;
  }

  /** Signs and sends a request, retrying network errors and 5xx responses with backoff. */
  private async request(method: string, path: string, body?: Uint8Array | string) {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.fetch(await this.signer.sign(`${this.base}${path}`, { method, body }));
        if (response.ok || response.status === 404) return response;
        if (response.status < 500 || attempt === MAX_ATTEMPTS) {
          throw new Error(`R2 ${method} ${path} failed: ${response.status} ${await response.text()}`);
        }
      } catch (error) {
        if (attempt === MAX_ATTEMPTS || (error instanceof Error && error.message.startsWith("R2 "))) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }

  async get(key: string) {
    const response = await this.request("GET", `/${encodeKey(key)}`);
    return response.status === 404 ? null : new Uint8Array(await response.arrayBuffer());
  }

  async put(key: string, data: Uint8Array | string) {
    await this.request("PUT", `/${encodeKey(key)}`, data);
  }

  async list(prefix: string) {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const query = new URLSearchParams({ "list-type": "2", prefix });
      if (token) query.set("continuation-token", token);
      const xml = await (await this.request("GET", `?${query}`)).text();
      for (const match of xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)) keys.push(decodeXml(match[1]!));
      token = xml.includes("<IsTruncated>true</IsTruncated>")
        ? decodeXml(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] ?? "")
        : undefined;
    } while (token);
    return keys;
  }

  async delete(key: string) {
    await this.request("DELETE", `/${encodeKey(key)}`);
  }
}

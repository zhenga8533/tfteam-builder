import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

/** Minimal key/value object storage, implemented by the local filesystem and by Cloudflare R2. */
export interface BlobStore {
  /** Returns null when the key doesn't exist. */
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, data: Uint8Array | string): Promise<void>;
  /** All keys starting with `prefix`, in no particular order. */
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

/** Stores each key as a file under `root`; used for local crawls and tests. */
export class FileBlobStore implements BlobStore {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(join(this.root, key)));
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async put(key: string, data: Uint8Array | string) {
    const file = join(this.root, key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async list(prefix: string) {
    // Keys use "/" separators; walk the deepest existing directory of the prefix.
    const directory = join(this.root, prefix.slice(0, prefix.lastIndexOf("/") + 1));
    const files = await readdir(directory, { recursive: true, withFileTypes: true }).catch((error: unknown) => {
      if (isMissing(error)) return [];
      throw error;
    });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => relative(this.root, join(entry.parentPath, entry.name)).split(sep).join("/"))
      .filter((key) => key.startsWith(prefix));
  }

  async delete(key: string) {
    await rm(join(this.root, key), { force: true });
  }
}

/**
 * Keeps the bytes of keys under `prefix` after the first read, so a job that reads the same objects in
 * several passes (the stats build) downloads each once. Writes go straight through and drop the copy.
 */
export class CachingBlobStore implements BlobStore {
  private readonly inner: BlobStore;
  private readonly prefix: string;
  private readonly cache = new Map<string, Uint8Array | null>();

  constructor(inner: BlobStore, prefix: string) {
    this.inner = inner;
    this.prefix = prefix;
  }

  async get(key: string) {
    if (!key.startsWith(this.prefix)) return this.inner.get(key);
    if (!this.cache.has(key)) this.cache.set(key, await this.inner.get(key));
    return this.cache.get(key) ?? null;
  }

  put(key: string, data: Uint8Array | string) {
    this.cache.delete(key);
    return this.inner.put(key, data);
  }

  list(prefix: string) {
    return this.inner.list(prefix);
  }

  delete(key: string) {
    this.cache.delete(key);
    return this.inner.delete(key);
  }
}

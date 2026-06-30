// operator-runtime application: the FAKE in-memory BlobStoreClient (Implementation 043-D1).
//
// A deterministic, isolated-per-instance test double for the vendor-neutral blob-store — NOT a real
// object store, NOT integration infrastructure. It holds and returns deep copies (structuredClone),
// uses no global state, no network, no filesystem, and no environment access. The payload is opaque:
// stored and returned verbatim, never parsed.
//
//   fake client ≠ integration test · fake blob-store ≠ real object-storage adapter.

import type {
  BlobMetadata,
  BlobObject,
  BlobStoreClient,
} from "./operator-runtime-blob-store.ts";

export class FakeBlobStoreClient implements BlobStoreClient {
  private readonly store = new Map<string, BlobObject>();

  put(object: BlobObject): void {
    if (typeof object.key !== "string" || object.key.length === 0) {
      throw new Error("BlobStoreClient.put requires a non-empty key");
    }
    if (typeof object.payload !== "string") {
      throw new Error("BlobStoreClient.put requires an opaque string payload (never parsed)");
    }
    this.store.set(object.key, structuredClone(object));
  }

  get(key: string): BlobObject | undefined {
    const found = this.store.get(key);
    return found === undefined ? undefined : structuredClone(found);
  }

  head(key: string): BlobMetadata | undefined {
    const found = this.store.get(key);
    return found === undefined ? undefined : structuredClone(found.metadata);
  }

  clear(): void {
    this.store.clear();
  }
}

// operator-runtime application: a VENDOR-NEUTRAL blob-store CLIENT PORT (Implementation 043-D1).
//
// A zero-dependency abstraction a future concrete object-storage adapter (D3) will sit behind. It
// models storage as opaque objects (a key, an opaque string payload, and string-only metadata) — NOT a
// real object-storage SDK, NOT filesystem persistence, NOT a deployment concern. It imports no SDK,
// reads no process environment, and never parses the payload (Garmin .fit/.tcx/.csv alike).
//
//   blob-store contract ≠ real object-storage adapter · artifact blob ≠ truth ·
//   Garmin artifact ≠ parsed metrics · Aurora advises, the athlete decides.

/** String-only object metadata — descriptive provenance, never derived meaning, never parsed content. */
export interface BlobMetadata {
  readonly [key: string]: string;
}

/** An opaque stored object: a key, the opaque payload (returned verbatim), and string metadata. */
export interface BlobObject {
  readonly key: string;
  /** opaque bytes/string — provenance, not truth; stored and returned unchanged, never parsed */
  readonly payload: string;
  readonly metadata: BlobMetadata;
}

/**
 * Minimal vendor-neutral blob-store client. A concrete adapter (D3) implements this over a real
 * object-storage SDK behind a scoped one-file guard token-pin; the layer never depends on the SDK.
 */
export interface BlobStoreClient {
  put(object: BlobObject): Promise<void>;
  get(key: string): Promise<BlobObject | undefined>;
  head(key: string): Promise<BlobMetadata | undefined>;
}

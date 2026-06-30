// operator-runtime application: the S3-compatible BlobStoreClient adapter (Implementation 043-D3).
//
// This is the ONE approved file permitted to reference `@aws-sdk/client-s3` (scoped one-file guard
// token-pin, approval-tied to 043-D3). It implements the ASYNC BlobStoreClient over an INJECTED
// send-client + bucket; it reads no process environment, creates no client from env, resolves no
// secret, and owns no deployment. The deployment executable (a later slice) builds and injects the
// real client.
//
//   S3 adapter ≠ artifact truth · object-storage object ≠ Evidence/ObservationSet/Signal ·
//   artifact payload ≠ parsed Garmin metrics · artifact storage success ≠ understanding ≠ delivery ≠ AthleteDecision ·
//   adapter config ≠ secret resolution · S3 blob-store ≠ the relational row-store · Aurora advises, the athlete decides.
//
// The payload is OPAQUE: stored as the object Body and read back verbatim, never parsed (FIT/TCX/CSV
// alike). Metadata is string-only provenance (BlobMetadata) — no domain meaning is encoded beyond it.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import type { BlobMetadata, BlobObject, BlobStoreClient } from "./operator-runtime-blob-store.ts";

/** The narrow surface the adapter needs — satisfied by a real S3Client (injected via createS3SendClient). */
export interface S3SendClient {
  send(command: unknown): Promise<unknown>;
}

interface S3GetObjectResult {
  readonly Body?: { transformToString(): Promise<string> };
  readonly Metadata?: Record<string, string>;
}
interface S3HeadObjectResult {
  readonly Metadata?: Record<string, string>;
}

/** True only for the expected "object does not exist" shape — never swallow unrelated errors. */
function isNotFound(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  const status = (err as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}

export class S3BlobStoreClient implements BlobStoreClient {
  private readonly client: S3SendClient;
  private readonly bucket: string;

  constructor(deps: { client: S3SendClient; bucket: string }) {
    this.client = deps.client;
    this.bucket = deps.bucket;
  }

  async put(object: BlobObject): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: object.key,
        Body: object.payload, // opaque payload, stored verbatim
        Metadata: { ...object.metadata }, // string-only provenance
      }),
    );
  }

  async get(key: string): Promise<BlobObject | undefined> {
    let out: unknown;
    try {
      out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
    const result = out as S3GetObjectResult;
    const payload = result.Body === undefined ? "" : await result.Body.transformToString();
    return { key, payload, metadata: (result.Metadata ?? {}) as BlobMetadata };
  }

  async head(key: string): Promise<BlobMetadata | undefined> {
    let out: unknown;
    try {
      out = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
    const result = out as S3HeadObjectResult;
    return (result.Metadata ?? {}) as BlobMetadata;
  }
}

/**
 * Build a send-client from an explicit, injected config (a real S3Client). This is the genuine runtime
 * use of `@aws-sdk/client-s3`. It reads NO process environment — the caller (the deployment executable,
 * a later slice) supplies the config. Provided so the dependency is real; tests inject a fake instead.
 */
export function createS3SendClient(config: S3ClientConfig): S3SendClient {
  const client = new S3Client(config);
  return { send: (command) => client.send(command as never) };
}

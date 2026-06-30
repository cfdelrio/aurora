// operator-runtime application: the runtime persistence CONFIG / ASSEMBLY boundary (Implementation 043-D4).
//
// A small, honest, injected-config seam that lets a future caller (the deployment executable, a later
// slice) assemble the already-approved concrete storage adapters WITHOUT reading the environment or
// hiding deployment choices. It assembles STORAGE CLIENTS only — a RowStoreClient + a BlobStoreClient —
// because those are the concrete adapters that exist (043-D2-R / 043-D3); it does NOT claim DB-backed
// repositories or a runnable operator session (those repository adapters do not exist yet).
//
//   runtime config boundary ≠ deployment · config object ≠ secret resolution · adapter assembly ≠ live verification ·
//   storage client bundle ≠ full operator session runner · rowStore ≠ a repository (none is DB-backed yet) ·
//   explicit bucket ≠ env-derived bucket · storage success ≠ understanding ≠ delivery ≠ AthleteDecision ·
//   Aurora advises, the athlete decides; Aurora never presents inference as fact.
//
// It imports only the LOCAL adapter types/classes — never the relational client or the object-storage
// SDK package directly — so both token-pins stay scoped to their one adapter file. It reads no process
// environment, resolves no secret,
// loads no file, and makes no network call; it only validates an injected config and wires constructors.

import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import type { BlobStoreClient } from "./operator-runtime-blob-store.ts";
import { PostgresRowStoreClient, type PostgresQueryable } from "./postgres-row-store-client.ts";
import { S3BlobStoreClient, type S3SendClient } from "./s3-blob-store-client.ts";

/** Explicit, fully-injected config — every collaborator is supplied by the caller; nothing is env-derived. */
export interface OperatorRuntimePersistenceConfig {
  /** an injected relational-row-store queryable (a pg-compatible Pool/Client) — the caller owns credentials */
  readonly relational: { readonly queryable: PostgresQueryable };
  /** an injected S3-compatible send-client + an EXPLICIT bucket — never read from the environment */
  readonly objectStorage: { readonly client: S3SendClient; readonly bucket: string };
}

/** The assembled bundle — storage CLIENTS only (not repositories, not a session runner). */
export interface OperatorRuntimePersistenceClients {
  readonly rowStore: RowStoreClient;
  readonly blobStore: BlobStoreClient;
}

/**
 * Assemble the concrete storage clients from an explicit, injected config. Pure wiring + minimal
 * validation: it constructs nothing from the environment, opens no connection itself, runs no session,
 * and returns only the two storage clients.
 */
export function createOperatorRuntimePersistenceClients(
  config: OperatorRuntimePersistenceConfig,
): OperatorRuntimePersistenceClients {
  if (config === null || typeof config !== "object") {
    throw new Error("OperatorRuntimePersistenceConfig requires relational and objectStorage");
  }
  const queryable = config.relational?.queryable;
  if (queryable === null || typeof queryable !== "object" || typeof queryable.query !== "function") {
    throw new Error("config.relational.queryable must be an injected relational-row-store queryable");
  }
  const client = config.objectStorage?.client;
  if (client === null || typeof client !== "object" || typeof client.send !== "function") {
    throw new Error("config.objectStorage.client must be an injected S3-compatible send-client");
  }
  const bucket = config.objectStorage?.bucket;
  if (typeof bucket !== "string" || bucket.length === 0) {
    throw new Error("config.objectStorage.bucket must be an explicit non-empty bucket name");
  }
  return Object.freeze({
    rowStore: new PostgresRowStoreClient(queryable),
    blobStore: new S3BlobStoreClient({ client, bucket }),
  });
}

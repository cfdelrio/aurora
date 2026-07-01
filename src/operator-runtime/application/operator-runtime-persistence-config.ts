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

// storage-backed bridge adapters (043-D4A) — local, SDK-free; they wire RowStoreClient/BlobStoreClient
// to the operator-runtime ports via the whitelist mappers.
import { RowStoreTrainingSessionRepository } from "./row-store-training-session-repository.ts";
import { RowStoreOperatorSessionRunRepository } from "./row-store-operator-session-run-repository.ts";
import { RowStoreOperatorSessionEnvelopeRepository } from "./row-store-operator-session-envelope-repository.ts";
import { RowStoreDecisionCaptureLinkRepository } from "./row-store-decision-capture-link-repository.ts";
import { BlobStoreTrainingArtifactObjectStore } from "./blob-store-training-artifact-object-store.ts";
import type { TrainingSessionRepository } from "./training-session-repository.ts";
import type { OperatorSessionRunRepository } from "./operator-session-run-repository.ts";
import type { OperatorSessionEnvelopeRepository } from "./operator-session-envelope-repository.ts";
import type { DecisionCaptureLinkRepository } from "./decision-capture-link-repository.ts";
import type { TrainingArtifactObjectStore } from "./training-artifact-object-store.ts";

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

/** The operator-runtime PORTS the run service consumes, plus the underlying storage clients. */
export interface OperatorRuntimePersistenceRepositories {
  readonly rowStore: RowStoreClient;
  readonly blobStore: BlobStoreClient;
  readonly repositories: {
    readonly trainingSessions: TrainingSessionRepository;
    readonly runs: OperatorSessionRunRepository;
    readonly envelopes: OperatorSessionEnvelopeRepository;
    readonly decisionLinks: DecisionCaptureLinkRepository;
  };
  readonly artifactStore: TrainingArtifactObjectStore;
}

/**
 * Assemble the storage-backed repository ports + artifact store the run service consumes, over the same
 * explicit injected config. Pure wiring: it builds the storage clients (above), then wraps each port's
 * storage-backed adapter around them. It opens no connection itself, reads no env, runs no session, and
 * calls neither invokeOperatorSession nor the underlying runtime — it returns ports, not a session runner.
 */
export function createOperatorRuntimePersistenceRepositories(
  config: OperatorRuntimePersistenceConfig,
): OperatorRuntimePersistenceRepositories {
  const { rowStore, blobStore } = createOperatorRuntimePersistenceClients(config);
  return Object.freeze({
    rowStore,
    blobStore,
    repositories: Object.freeze({
      trainingSessions: new RowStoreTrainingSessionRepository(rowStore),
      runs: new RowStoreOperatorSessionRunRepository(rowStore),
      envelopes: new RowStoreOperatorSessionEnvelopeRepository(rowStore),
      decisionLinks: new RowStoreDecisionCaptureLinkRepository(rowStore),
    }),
    artifactStore: new BlobStoreTrainingArtifactObjectStore(blobStore),
  });
}

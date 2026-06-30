// operator-runtime deployment: env-config → persistence ASSEMBLY (Implementation 043-D5B, in-`src` part).
//
// Turns a validated OperatorRuntimeEnvironmentConfig into the storage-backed repositories + artifact store,
// by constructing the concrete clients through the already-token-pinned factories and wiring them via the
// D4/D4A boundary. It reads NO process environment (the out-of-`src` executable supplies the loaded config),
// resolves no secret, runs no session, and constructs no whole-core command. The concrete-client factories
// are injectable so this is testable with fakes (no live DB/S3 in default tests).
//
//   env-config assembly ≠ deployment executable · client construction ≠ live service verification ·
//   repository assembly ≠ session execution · storage wiring success ≠ understanding ≠ delivery ≠ AthleteDecision ·
//   Aurora advises, the athlete decides; Aurora never presents inference as fact.

import type { OperatorRuntimeEnvironmentConfig } from "./operator-runtime-env-config.ts";
import {
  createOperatorRuntimePersistenceRepositories,
  type OperatorRuntimePersistenceRepositories,
} from "../application/operator-runtime-persistence-config.ts";
import { createPostgresQueryable, type PostgresQueryable } from "../application/postgres-row-store-client.ts";
import { createS3SendClient, type S3SendClient } from "../application/s3-blob-store-client.ts";

/** Injectable concrete-client factories — default to the real (token-pinned) ones; tests inject fakes. */
export interface OperatorRuntimeClientFactories {
  readonly createQueryable?: (config: { readonly connectionString: string }) => PostgresQueryable;
  readonly createSendClient?: (config: {
    readonly region?: string;
    readonly endpoint?: string;
    readonly forcePathStyle?: boolean;
  }) => S3SendClient;
}

/**
 * Build the operator-runtime repositories + artifact store from a validated deployment config. Pure wiring:
 * it constructs the clients via the injected/default factories and hands them to the D4/D4A assembly. It
 * opens no connection itself (the pg Pool / S3 client connect lazily) and runs no session.
 */
export function createOperatorRuntimePersistenceFromEnvironmentConfig(
  envConfig: OperatorRuntimeEnvironmentConfig,
  factories: OperatorRuntimeClientFactories = {},
): OperatorRuntimePersistenceRepositories {
  const makeQueryable = factories.createQueryable ?? ((config) => createPostgresQueryable(config));
  const makeSendClient = factories.createSendClient ?? ((config) => createS3SendClient(config));

  const queryable = makeQueryable({ connectionString: envConfig.relational.connectionString });
  const client = makeSendClient({
    ...(envConfig.objectStorage.region !== undefined ? { region: envConfig.objectStorage.region } : {}),
    ...(envConfig.objectStorage.endpoint !== undefined ? { endpoint: envConfig.objectStorage.endpoint } : {}),
    ...(envConfig.objectStorage.forcePathStyle !== undefined ? { forcePathStyle: envConfig.objectStorage.forcePathStyle } : {}),
  });

  return createOperatorRuntimePersistenceRepositories({
    relational: { queryable },
    objectStorage: { client, bucket: envConfig.objectStorage.bucket },
  });
}

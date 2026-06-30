// operator-runtime deployment: the runtime ENV/CONFIG LOADER boundary (Implementation 043-D5A).
//
// A small, out-of-application config loader that turns an EXPLICIT, INJECTED environment map into typed
// deployment config for later wiring. It is NOT the deployment executable, NOT the session runner, NOT a
// secret manager. It reads ONLY an injected `env` map (never the process environment here) and only the explicit
// AURORA_OPERATOR_* allowlist below; a future out-of-`src` executable supplies the real env. It builds no
// pg Pool, no S3 client, opens no connection, makes no network call, resolves no secret, runs no session,
// and logs nothing.
//
//   env config loader ≠ secret manager · env config loader ≠ deployment executable ·
//   runtime config ≠ live service verification · database URL config ≠ an opened connection ·
//   bucket config ≠ object-storage access · configuration success ≠ persistence success ≠ understanding ≠
//   delivery ≠ AthleteDecision · Aurora advises, the athlete decides; Aurora never presents inference as fact.
//
// NOTE: the process-env wrapper is DEFERRED to the out-of-`src` executable slice on purpose — the repo
// pins the process-environment token to exactly one core file, so reading it here would force a repo-wide
// guard change. The injected-env loader keeps this slice env-free and fully testable.

/** The EXACT environment keys this loader will read — nothing generic, no credentials. */
export const OPERATOR_RUNTIME_ENV_KEYS = {
  databaseUrl: "AURORA_OPERATOR_DATABASE_URL",
  artifactBucket: "AURORA_OPERATOR_ARTIFACT_BUCKET",
  artifactRegion: "AURORA_OPERATOR_ARTIFACT_REGION",
  artifactEndpoint: "AURORA_OPERATOR_ARTIFACT_ENDPOINT",
  artifactForcePathStyle: "AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE",
} as const;

/** An injected environment source — a plain key→value map the caller (executable) supplies. */
export interface OperatorRuntimeEnvSource {
  readonly [key: string]: string | undefined;
}

/** Typed deployment config — connection/bucket inputs only; NOT constructed clients, NOT secrets. */
export interface OperatorRuntimeEnvironmentConfig {
  readonly relational: { readonly connectionString: string };
  readonly objectStorage: {
    readonly bucket: string;
    readonly region?: string;
    readonly endpoint?: string;
    readonly forcePathStyle?: boolean;
  };
}

/** A safe result — failure reports only the MISSING KEY NAMES, never any value or secret. */
export type OperatorRuntimeEnvConfigResult =
  | { readonly status: "ok"; readonly config: OperatorRuntimeEnvironmentConfig }
  | { readonly status: "invalid"; readonly missing: readonly string[] };

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Read the explicit AURORA_OPERATOR_* keys from an injected env map and return typed config. Reads no
 * other keys (generic names and credential keys are ignored), constructs no client, and never embeds a
 * value in the failure result.
 */
export function loadOperatorRuntimeConfigFromEnv(
  env: OperatorRuntimeEnvSource,
): OperatorRuntimeEnvConfigResult {
  const connectionString = env[OPERATOR_RUNTIME_ENV_KEYS.databaseUrl];
  const bucket = env[OPERATOR_RUNTIME_ENV_KEYS.artifactBucket];

  const missing: string[] = [];
  if (connectionString === undefined || connectionString.length === 0) {
    missing.push(OPERATOR_RUNTIME_ENV_KEYS.databaseUrl);
  }
  if (bucket === undefined || bucket.length === 0) {
    missing.push(OPERATOR_RUNTIME_ENV_KEYS.artifactBucket);
  }
  if (connectionString === undefined || connectionString.length === 0 || bucket === undefined || bucket.length === 0) {
    return { status: "invalid", missing: Object.freeze(missing) };
  }

  const region = env[OPERATOR_RUNTIME_ENV_KEYS.artifactRegion];
  const endpoint = env[OPERATOR_RUNTIME_ENV_KEYS.artifactEndpoint];
  const forcePathStyle = parseBoolean(env[OPERATOR_RUNTIME_ENV_KEYS.artifactForcePathStyle]);

  return {
    status: "ok",
    config: {
      relational: { connectionString },
      objectStorage: {
        bucket,
        ...(region !== undefined && region.length > 0 ? { region } : {}),
        ...(endpoint !== undefined && endpoint.length > 0 ? { endpoint } : {}),
        ...(forcePathStyle !== undefined ? { forcePathStyle } : {}),
      },
    },
  };
}

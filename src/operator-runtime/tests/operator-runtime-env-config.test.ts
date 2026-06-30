// operator-runtime tests (Implementation 043-D5A): the deployment runtime ENV/CONFIG LOADER boundary.
// It turns an EXPLICIT injected env map into typed deployment config — reading only the AURORA_OPERATOR_*
// allowlist, never process.env, never credentials, building no client and opening no connection.
//
//   env config loader ≠ secret manager ≠ deployment executable · database URL config ≠ an opened connection ·
//   bucket config ≠ object-storage access · configuration success ≠ persistence success ≠ delivery.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  loadOperatorRuntimeConfigFromEnv,
  OPERATOR_RUNTIME_ENV_KEYS,
} from "../deployment/operator-runtime-env-config.ts";

const FULL_ENV = {
  AURORA_OPERATOR_DATABASE_URL: "postgresql://h/db",
  AURORA_OPERATOR_ARTIFACT_BUCKET: "aurora-operator-artifacts",
  AURORA_OPERATOR_ARTIFACT_REGION: "us-east-1",
  AURORA_OPERATOR_ARTIFACT_ENDPOINT: "https://object.example",
  AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE: "true",
} as const;

test("1/2/3/4 loads relational + object-storage config from the explicit AURORA_OPERATOR_* keys (incl. optionals)", () => {
  const result = loadOperatorRuntimeConfigFromEnv(FULL_ENV);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.config.relational.connectionString, "postgresql://h/db");
  assert.equal(result.config.objectStorage.bucket, "aurora-operator-artifacts");
  assert.equal(result.config.objectStorage.region, "us-east-1");
  assert.equal(result.config.objectStorage.endpoint, "https://object.example");
  assert.equal(result.config.objectStorage.forcePathStyle, true);
});

test("1/7/8/9 reads ONLY the allowlisted keys; ignores generic / live-provider / AWS credential keys", () => {
  const env = {
    ...FULL_ENV,
    DATABASE_URL: "postgresql://generic/should-be-ignored",
    AWS_ACCESS_KEY_ID: "AKIA-should-be-ignored",
    AWS_SECRET_ACCESS_KEY: "secret-should-be-ignored",
    AWS_REGION: "eu-west-1",
    OPENAI_API_KEY: "sk-should-be-ignored",
  };
  const result = loadOperatorRuntimeConfigFromEnv(env);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  // the generic DATABASE_URL is ignored — only the explicit allowlisted key is used
  assert.equal(result.config.relational.connectionString, "postgresql://h/db");
  // region comes from the explicit artifact key, not AWS_REGION
  assert.equal(result.config.objectStorage.region, "us-east-1");
  // no credential field exists on the typed config at all
  const json = JSON.stringify(result.config);
  for (const leaked of ["AKIA-should-be-ignored", "secret-should-be-ignored", "sk-should-be-ignored", "eu-west-1", "generic/should-be-ignored"]) {
    assert.equal(json.includes(leaked), false, `config must not include ignored value '${leaked}'`);
  }
});

test("5/6 fails safely when required keys are missing — reports only key NAMES, never values/secrets", () => {
  const noDb = loadOperatorRuntimeConfigFromEnv({ AURORA_OPERATOR_ARTIFACT_BUCKET: "b" });
  assert.equal(noDb.status, "invalid");
  if (noDb.status === "invalid") assert.deepEqual(noDb.missing, [OPERATOR_RUNTIME_ENV_KEYS.databaseUrl]);

  const noBucket = loadOperatorRuntimeConfigFromEnv({ AURORA_OPERATOR_DATABASE_URL: "postgresql://secret-host/db" });
  assert.equal(noBucket.status, "invalid");
  if (noBucket.status === "invalid") {
    assert.deepEqual(noBucket.missing, [OPERATOR_RUNTIME_ENV_KEYS.artifactBucket]);
    // the provided connection value must never appear in the failure result
    assert.equal(JSON.stringify(noBucket).includes("secret-host"), false, "failure result must not echo provided values");
  }

  const empty = loadOperatorRuntimeConfigFromEnv({});
  assert.equal(empty.status, "invalid");
  if (empty.status === "invalid") assert.deepEqual([...empty.missing].sort(), [OPERATOR_RUNTIME_ENV_KEYS.artifactBucket, OPERATOR_RUNTIME_ENV_KEYS.databaseUrl].sort());
});

test("10/11/17 returns connection/bucket inputs only — no constructed client, no Evidence/ObservationSet/Signal/AthleteDecision", () => {
  const result = loadOperatorRuntimeConfigFromEnv({ AURORA_OPERATOR_DATABASE_URL: "postgresql://h/db", AURORA_OPERATOR_ARTIFACT_BUCKET: "b" });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  // relational input is a connection STRING only — never a Pool/client
  assert.deepEqual(Object.keys(result.config.relational), ["connectionString"]);
  // object-storage input is bucket(+optionals) only — never an S3 client
  assert.ok(Object.keys(result.config.objectStorage).every((k) => ["bucket", "region", "endpoint", "forcePathStyle"].includes(k)));
  const json = JSON.stringify(result.config).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "athletedecision", "pool", "client", "delivery"]) {
    assert.equal(json.includes(derived), false, `config must contain no '${derived}'`);
  }
});

test("12-16 the loader file constructs no client, runs no session, makes no I/O (it imports nothing)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "..", "deployment", "operator-runtime-env-config.ts"), "utf8");
  // a pure config loader: it imports nothing and references none of the runtime/assembly/SDK symbols
  assert.equal(/^\s*import\s/m.test(src), false, "the config loader imports nothing");
  for (const forbidden of [
    "createOperatorRuntimePersistenceRepositories",
    "createOperatorRuntimePersistenceClients",
    "runOperatorSession",
    "invokeOperatorSession",
    "offlineReflectionRuntime",
    "new Pool",
    "new S3Client",
    "fetch(",
  ]) {
    assert.equal(src.includes(forbidden), false, `config loader must not reference '${forbidden}'`);
  }
  // and it reads no process environment here (injected env only)
  assert.equal(new RegExp("process" + "\\.env").test(src), false, "loader reads no process.env (injected env only)");
});

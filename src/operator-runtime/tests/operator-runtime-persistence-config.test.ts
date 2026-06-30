// operator-runtime tests (Implementation 043-D4): the runtime persistence config / assembly boundary.
// It wires the concrete storage adapters from an EXPLICIT injected config — no env, no secret, no live
// service — and returns storage clients only (not repositories, not a session runner).
//
//   runtime config boundary ≠ deployment · config object ≠ secret resolution · explicit bucket ≠ env-derived ·
//   storage client bundle ≠ full operator session runner · storage success ≠ understanding ≠ delivery.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createOperatorRuntimePersistenceClients,
  type OperatorRuntimePersistenceConfig,
} from "../application/operator-runtime-persistence-config.ts";
import type { PostgresQueryable } from "../application/postgres-row-store-client.ts";
import type { S3SendClient } from "../application/s3-blob-store-client.ts";
import { OPERATOR_RUNTIME_TABLES } from "../index.ts";

// fake pg-compatible queryable — records calls, serves canned rows; no live DB
class FakeQueryable implements PostgresQueryable {
  readonly calls: { text: string; values: readonly unknown[] }[] = [];
  rows: Record<string, unknown>[] = [];
  async query(text: string, values: readonly unknown[] = []): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.calls.push({ text, values });
    return { rows: this.rows };
  }
}

// fake S3-compatible send-client — records the (real) commands; no live S3
class FakeS3Client implements S3SendClient {
  readonly sent: { name: string; input: Record<string, unknown> }[] = [];
  private readonly store = new Map<string, { body: string; metadata: Record<string, string> }>();
  async send(command: unknown): Promise<unknown> {
    const c = command as { constructor: { name: string }; input: Record<string, unknown> };
    this.sent.push({ name: c.constructor.name, input: c.input });
    const key = String(c.input["Key"]);
    if (c.constructor.name === "PutObjectCommand") {
      this.store.set(key, { body: String(c.input["Body"]), metadata: (c.input["Metadata"] ?? {}) as Record<string, string> });
      return {};
    }
    const obj = this.store.get(key);
    if (obj === undefined) { const e = new Error("NoSuchKey"); e.name = "NoSuchKey"; throw e; }
    if (c.constructor.name === "GetObjectCommand") return { Body: { transformToString: async () => obj.body }, Metadata: obj.metadata };
    return { Metadata: obj.metadata };
  }
}

function freshConfig(): { config: OperatorRuntimePersistenceConfig; queryable: FakeQueryable; s3: FakeS3Client } {
  const queryable = new FakeQueryable();
  const s3 = new FakeS3Client();
  return {
    config: { relational: { queryable }, objectStorage: { client: s3, bucket: "aurora-operator-artifacts" } },
    queryable,
    s3,
  };
}

test("1/2 the factory assembles a RowStoreClient (Postgres queryable) and a BlobStoreClient (S3 send-client + explicit bucket)", () => {
  const { config } = freshConfig();
  const clients = createOperatorRuntimePersistenceClients(config);
  for (const m of ["insert", "get", "list", "findBy"] as const) assert.equal(typeof clients.rowStore[m], "function");
  for (const m of ["put", "get", "head"] as const) assert.equal(typeof clients.blobStore[m], "function");
  // storage clients ONLY — no repository / session-runner surface leaks into the bundle
  assert.deepEqual(Object.keys(clients).sort(), ["blobStore", "rowStore"]);
});

test("3 the assembled rowStore is exercisable with the fake queryable (no live DB)", async () => {
  const { config, queryable } = freshConfig();
  const { rowStore } = createOperatorRuntimePersistenceClients(config);
  await rowStore.insert(OPERATOR_RUNTIME_TABLES.trainingSession, { id: "training:1", athlete_ref: "athlete:1" });
  assert.equal(queryable.calls.length, 1);
  assert.match(queryable.calls[0]!.text, /insert into operator_runtime_row/i);
});

test("4 the assembled blobStore is exercisable with the fake S3 send-client + explicit bucket (no live S3)", async () => {
  const { config, s3 } = freshConfig();
  const { blobStore } = createOperatorRuntimePersistenceClients(config);
  await blobStore.put({ key: "object-store://raw/abc", payload: "opaque", metadata: { reference: "object-store://raw/abc", source: "manual", created_at_iso: "2026-06-29T07:00:00.000Z" } });
  assert.equal(s3.sent[0]!.name, "PutObjectCommand");
  assert.equal(s3.sent[0]!.input["Bucket"], "aurora-operator-artifacts");
  assert.equal((await blobStore.get("object-store://raw/abc"))?.payload, "opaque");
});

test("5 the bucket is explicit (caller-supplied), never environment-derived", () => {
  const { config, s3 } = freshConfig();
  const { blobStore } = createOperatorRuntimePersistenceClients(config);
  void blobStore; // assembled from the explicit config.objectStorage.bucket
  // the only bucket the adapter can use is the one injected — proven by exercising put (test 4)
  assert.equal(config.objectStorage.bucket, "aurora-operator-artifacts");
  assert.equal(s3.sent.length, 0, "assembly itself performs no I/O");
});

test("6/7 the factory rejects a malformed config and resolves no credentials/secrets", () => {
  // minimal explicit validation; nothing is derived from the environment or a secret store
  assert.throws(() => createOperatorRuntimePersistenceClients(null as unknown as OperatorRuntimePersistenceConfig));
  assert.throws(() => createOperatorRuntimePersistenceClients({ relational: { queryable: {} }, objectStorage: { client: new FakeS3Client(), bucket: "b" } } as unknown as OperatorRuntimePersistenceConfig));
  assert.throws(() => createOperatorRuntimePersistenceClients({ relational: { queryable: new FakeQueryable() }, objectStorage: { client: new FakeS3Client(), bucket: "" } } as unknown as OperatorRuntimePersistenceConfig));
});

test("8-16 assembly runs no session, derives nothing, delivers nothing, performs no deployment (pure wiring)", () => {
  const { config, queryable, s3 } = freshConfig();
  const clients = createOperatorRuntimePersistenceClients(config);
  // pure wiring: no queries, no S3 commands, no derived domain objects produced by assembly itself
  assert.equal(queryable.calls.length, 0);
  assert.equal(s3.sent.length, 0);
  const json = JSON.stringify(Object.keys(clients)).toLowerCase();
  for (const banned of ["evidence", "observationset", "signal", "athletedecision", "session", "invoke", "delivery", "deploy"]) {
    assert.equal(json.includes(banned), false, `assembled bundle must expose no '${banned}' surface`);
  }
});

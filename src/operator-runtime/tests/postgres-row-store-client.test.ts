// operator-runtime tests (Implementation 043-D2-R): the Postgres-compatible RowStoreClient adapter,
// exercised against a FAKE pg-compatible queryable — NO live database, NO integration test. Writes/reads
// are parameterized; redaction stays owned by the mappers/factories; the adapter stores rows verbatim.
//
//   Postgres adapter ≠ persistence truth · DB row ≠ Evidence/ObservationSet/Signal/AthleteDecision ·
//   adapter tests ≠ live integration tests · Postgres row-store ≠ object storage.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";

import {
  PostgresRowStoreClient,
  OPERATOR_RUNTIME_ROW_TABLE,
  type PostgresQueryable,
} from "../application/postgres-row-store-client.ts";
import {
  OPERATOR_RUNTIME_TABLES,
  trainingSessionRecord,
  trainingSessionToRow,
  operatorSessionEnvelopeRecord,
  operatorSessionEnvelopeToRow,
} from "../index.ts";
import type {
  RowStoreClient,
  StorageRow,
  TrainingSessionId,
  OperatorSessionRunId,
  OperatorSessionEnvelopeRecordId,
  OperatorSessionEnvelopeRecord,
} from "../index.ts";

const T = (iso: string) => timestamp(iso);
const tsid = (id: string) => id as TrainingSessionId;
const rid = (id: string) => id as OperatorSessionRunId;
const eid = (id: string) => id as OperatorSessionEnvelopeRecordId;

const ALLOWED_ENVELOPE_KEYS = new Set([
  "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
  "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
]);

// A fake pg-compatible queryable: records every call and returns canned rows. No real connection.
class RecordingQueryable implements PostgresQueryable {
  readonly calls: { text: string; values: readonly unknown[] }[] = [];
  rows: Record<string, unknown>[] = [];
  async query(text: string, values: readonly unknown[] = []): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.calls.push({ text, values });
    return { rows: this.rows };
  }
}

function trainingRow(): StorageRow {
  return trainingSessionToRow(
    trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") }),
  );
}

function cleanEnvelope(): OperatorSessionEnvelope {
  return {
    status: "reflection-ready",
    deliveryWithheld: true,
    rawRetained: false,
    reflectionRef: "rendered-message-record:abc",
    reflectionFlags: { validationPassed: true, uncertaintyPreserved: true, limitationsPreserved: true, traceabilityPreserved: true },
    decisionCapture: { kind: "athlete-decision-invitation", athleteRef: "athlete:1", acceptableSources: ["athlete-declared", "athlete-reported"] },
    intakeStatus: "accepted",
    mediation: { operatorRef: "operator:1" },
    traceSummary: { stoppedAt: "delivery-withheld", renderedMessageRecordId: "rendered-message-record:abc", displayEligibility: "eligible" },
  };
}

// --- contract ---------------------------------------------------------------------------------------

test("1 PostgresRowStoreClient implements the async RowStoreClient", () => {
  const client: RowStoreClient = new PostgresRowStoreClient(new RecordingQueryable());
  for (const m of ["insert", "get", "list", "findBy"] as const) {
    assert.equal(typeof client[m], "function", `must implement ${m}`);
  }
});

test("2/6 insert issues a single parameterized write (values carried as params, never concatenated)", async () => {
  const q = new RecordingQueryable();
  const client = new PostgresRowStoreClient(q);
  await client.insert(OPERATOR_RUNTIME_TABLES.trainingSession, trainingRow());
  assert.equal(q.calls.length, 1);
  const call = q.calls[0];
  assert.ok(call);
  assert.match(call.text, /insert into operator_runtime_row/i);
  // placeholders, not interpolated values
  for (const ph of ["$1", "$2", "$3"]) assert.ok(call.text.includes(ph), `expected placeholder ${ph}`);
  assert.deepEqual(call.values.slice(0, 2), [OPERATOR_RUNTIME_TABLES.trainingSession, "training:1"]);
  assert.equal(typeof call.values[2], "string", "row_data is passed as a JSON string parameter");
  // the athlete value lives in a parameter, never in the SQL text
  assert.equal(call.text.includes("athlete:1"), false, "no row value may be concatenated into SQL");
});

test("3/7 get retrieves by table + id and maps row_data back to a StorageRow", async () => {
  const q = new RecordingQueryable();
  const row = trainingRow();
  q.rows = [{ row_data: row }];
  const client = new PostgresRowStoreClient(q);
  const got = await client.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1");
  assert.deepEqual(got, row);
  const call = q.calls[0];
  assert.ok(call);
  assert.match(call.text, /where table_name = \$1 and id = \$2/i);
  assert.deepEqual(call.values, [OPERATOR_RUNTIME_TABLES.trainingSession, "training:1"]);
});

test("4 list retrieves rows by table", async () => {
  const q = new RecordingQueryable();
  q.rows = [{ row_data: { id: "a" } }, { row_data: { id: "b" } }];
  const client = new PostgresRowStoreClient(q);
  const rows = await client.list(OPERATOR_RUNTIME_TABLES.trainingSession);
  assert.deepEqual(rows.map((r) => r["id"]), ["a", "b"]);
  assert.match(q.calls[0]!.text, /where table_name = \$1/i);
});

test("5 findBy retrieves rows by a scalar field, parameterized via row_data ->>", async () => {
  const q = new RecordingQueryable();
  q.rows = [{ row_data: { id: "a", athlete_ref: "athlete:1" } }];
  const client = new PostgresRowStoreClient(q);
  const rows = await client.findBy(OPERATOR_RUNTIME_TABLES.trainingSession, "athlete_ref", "athlete:1");
  assert.deepEqual(rows.map((r) => r["id"]), ["a"]);
  const call = q.calls[0];
  assert.ok(call);
  assert.match(call.text, /row_data ->> \$2 = \$3/i);
  assert.deepEqual(call.values, [OPERATOR_RUNTIME_TABLES.trainingSession, "athlete_ref", "athlete:1"]);
});

// --- safety: adapter stores verbatim; redaction owned upstream --------------------------------------

test("8-18 adapter persists no raw outcome / reflection text / provider output / hidden reasoning / secrets / delivery / eventRecordIds / AthleteDecision", async () => {
  // a polluted record bypassing the factory — the row mapper whitelists; the adapter stores verbatim
  const polluted = {
    ...cleanEnvelope(),
    rawOutcome: { reflection: { text: "energy felt low today" } },
    reflection: { text: "energy felt low today" },
    providerOutput: "raw provider completion body",
    hiddenReasoning: "chain-of-thought scratchpad",
    secret: "Bearer sk-secret-12345",
    deliveryId: "delivery:zzz",
    deliveredArtifact: { body: "rendered message body" },
    eventRecordIds: ["evt:1", "evt:2"],
    athleteDecision: { kind: "athlete-decision", choice: "rest" },
  } as unknown as OperatorSessionEnvelope;
  const pollutedRecord = {
    id: eid("envelope:1"),
    runId: rid("run:1"),
    athleteRef: "athlete:1",
    envelope: polluted,
    recordedAt: T("2026-06-30T08:01:06.000Z"),
  } as unknown as OperatorSessionEnvelopeRecord;

  const q = new RecordingQueryable();
  const client = new PostgresRowStoreClient(q);
  await client.insert(OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope, operatorSessionEnvelopeToRow(pollutedRecord));

  const jsonParam = q.calls[0]!.values[2];
  assert.equal(typeof jsonParam, "string");
  const storedEnvelope = JSON.parse(JSON.parse(jsonParam as string).envelope_json) as Record<string, unknown>;
  for (const key of Object.keys(storedEnvelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `adapter persisted a non-whitelisted key '${key}'`);
  }
  const json = JSON.stringify(q.calls[0]).toLowerCase();
  for (const banned of [
    "rawoutcome", "energy felt low", "provideroutput", "raw provider completion", "hiddenreasoning",
    "chain-of-thought", "bearer", "sk-secret", "deliveryid", "delivery:zzz", "deliveredartifact",
    "eventrecordids", "evt:1", "athletedecision",
  ]) {
    assert.equal(json.includes(banned), false, `adapter write must not contain '${banned}'`);
  }
});

test("8-11/19 adapter creates no Evidence/ObservationSet/Signal/AthleteDecision and parses no Garmin artifact", async () => {
  const q = new RecordingQueryable();
  const client = new PostgresRowStoreClient(q);
  await client.insert(OPERATOR_RUNTIME_TABLES.trainingSession, trainingRow());
  const json = JSON.stringify(q.calls[0]).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "athletedecision", "metric", "measurement", "lap", "trackpoint", "fit-record"]) {
    assert.equal(json.includes(derived), false, `adapter must derive no '${derived}'`);
  }
});

test("20/21 unknown table is rejected; default tests require no live DB (fake queryable only)", async () => {
  const client = new PostgresRowStoreClient(new RecordingQueryable());
  await assert.rejects(() => client.get("evidence", "x"), /unknown operator-runtime table/);
  await assert.rejects(() => client.insert("delivery", { id: "x" }), /unknown operator-runtime table/);
});

// --- schema-change files ---------------------------------------------------------------------------

test("schema defines ONLY the operator-runtime row table (no Evidence/ObservationSet/Signal/AthleteDecision/delivery/object-storage/Garmin table)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const schemaDir = join(here, "..", "schema");
  const sqlFiles = readdirSync(schemaDir).filter((f) => f.endsWith(".sql"));
  assert.ok(sqlFiles.length >= 1, "expected at least one schema-change .sql file");
  const sql = sqlFiles.map((f) => readFileSync(join(schemaDir, f), "utf8")).join("\n").toLowerCase();

  // the only table created is the vendor-neutral operator-runtime row table
  assert.ok(sql.includes(`create table if not exists ${OPERATOR_RUNTIME_ROW_TABLE}`), "must create operator_runtime_row");
  const created = [...sql.matchAll(/create table(?:\s+if not exists)?\s+([a-z_][a-z0-9_]*)/g)].map((m) => m[1]);
  assert.deepEqual(created, [OPERATOR_RUNTIME_ROW_TABLE], "exactly one table may be defined");

  for (const forbidden of ["evidence", "observation", "observation_set", "signal", "athlete_decision", "delivery", "s3", "blob", "object_storage", "garmin", "metric"]) {
    assert.equal(sql.includes(`table if not exists ${forbidden}`), false, `schema must define no '${forbidden}' table`);
    assert.equal(sql.includes(`create table ${forbidden}`), false, `schema must define no '${forbidden}' table`);
  }
});

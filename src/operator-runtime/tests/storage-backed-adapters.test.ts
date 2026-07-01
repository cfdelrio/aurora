// operator-runtime tests (Implementation 043-D4A): the storage-backed bridge adapters — RowStoreClient
// behind the four repository ports, BlobStoreClient behind the artifact store — exercised with the D1
// in-memory fake clients (no live DB/S3). Redaction is preserved; payloads stay opaque.
//
//   row-store repository ≠ the relational-client adapter · blob-store artifact store ≠ S3 adapter ·
//   OperatorSessionEnvelopeRecord ≠ raw outcome · DecisionCaptureLink ≠ AthleteDecision · artifact payload ≠ truth.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";

import {
  FakeRowStoreClient,
  FakeBlobStoreClient,
  OPERATOR_RUNTIME_TABLES,
  trainingSessionRecord,
  trainingSessionRawArtifactRef,
  operatorSessionRunRecord,
  operatorSessionEnvelopeRecord,
  decisionCaptureLink,
} from "../index.ts";
import type {
  TrainingSessionId,
  OperatorSessionRunId,
  OperatorSessionEnvelopeRecordId,
  DecisionCaptureLinkId,
  OperatorSessionEnvelopeRecord,
} from "../index.ts";

import { RowStoreTrainingSessionRepository } from "../application/row-store-training-session-repository.ts";
import { RowStoreOperatorSessionRunRepository } from "../application/row-store-operator-session-run-repository.ts";
import { RowStoreOperatorSessionEnvelopeRepository } from "../application/row-store-operator-session-envelope-repository.ts";
import { RowStoreDecisionCaptureLinkRepository } from "../application/row-store-decision-capture-link-repository.ts";
import { BlobStoreTrainingArtifactObjectStore } from "../application/blob-store-training-artifact-object-store.ts";
import { createOperatorRuntimePersistenceRepositories } from "../application/operator-runtime-persistence-config.ts";
import type { PostgresQueryable } from "../application/postgres-row-store-client.ts";
import type { S3SendClient } from "../application/s3-blob-store-client.ts";

const T = (iso: string) => timestamp(iso);
const tsid = (id: string) => id as TrainingSessionId;
const rid = (id: string) => id as OperatorSessionRunId;
const eid = (id: string) => id as OperatorSessionEnvelopeRecordId;
const lid = (id: string) => id as DecisionCaptureLinkId;

const FIT_BLOB = " FIT garmin-binary HR=152 PWR=240";
const TCX_BLOB = "<TrainingCenterDatabase><Activity Sport='Running'>...</Activity>";
const CSV_BLOB = "timestamp,hr,power\n2026-06-29T07:00:00Z,152,240\n";

const ALLOWED_ENVELOPE_KEYS = new Set([
  "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
  "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
]);

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

// --- row-store repositories ------------------------------------------------------------------------

test("1/2 row-store TrainingSessionRepository saves/retrieves and lists by athlete (through the client + mappers)", async () => {
  const client = new FakeRowStoreClient();
  const repo = new RowStoreTrainingSessionRepository(client);
  const rec = trainingSessionRecord({
    id: tsid("training:1"),
    athleteRef: "athlete:1",
    source: "garmin",
    artifact: trainingSessionRawArtifactRef({ source: "garmin", reference: "object-store://raw/abc", mediaType: "application/vnd.ant.fit", capturedAt: T("2026-06-29T07:00:00.000Z") }),
    recordedAt: T("2026-06-30T08:00:00.000Z"),
  });
  await repo.save(rec);
  assert.deepEqual(await repo.findById(tsid("training:1")), rec);
  // it went through the injected row-store client (a row is present under the training-session table)
  assert.ok(await client.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1"), "row stored via the RowStoreClient");

  await repo.save(trainingSessionRecord({ id: tsid("training:2"), athleteRef: "athlete:1", source: "manual", recordedAt: T("2026-06-30T08:00:01.000Z") }));
  await repo.save(trainingSessionRecord({ id: tsid("training:3"), athleteRef: "athlete:2", source: "manual", recordedAt: T("2026-06-30T08:00:02.000Z") }));
  assert.deepEqual((await repo.listByAthlete("athlete:1")).map((r) => String(r.id)), ["training:1", "training:2"]);
});

test("3 row-store OperatorSessionRunRepository saves/retrieves and lists by training session", async () => {
  const repo = new RowStoreOperatorSessionRunRepository(new FakeRowStoreClient());
  const rec = operatorSessionRunRecord({ id: rid("run:1"), athleteRef: "athlete:1", trainingSessionId: tsid("training:1"), status: "reflection-ready", startedAt: T("2026-06-30T08:01:00.000Z"), completedAt: T("2026-06-30T08:01:05.000Z"), envelopeRecordId: eid("envelope:1") });
  await repo.save(rec);
  assert.deepEqual(await repo.findById(rid("run:1")), rec);
  assert.deepEqual((await repo.listByTrainingSession(tsid("training:1"))).map((r) => String(r.id)), ["run:1"]);
});

test("4 row-store OperatorSessionEnvelopeRepository saves/retrieves and finds by run", async () => {
  const repo = new RowStoreOperatorSessionEnvelopeRepository(new FakeRowStoreClient());
  const rec = operatorSessionEnvelopeRecord({ id: eid("envelope:1"), runId: rid("run:1"), athleteRef: "athlete:1", envelope: cleanEnvelope(), recordedAt: T("2026-06-30T08:01:06.000Z") });
  await repo.save(rec);
  assert.deepEqual(await repo.findById(eid("envelope:1")), rec);
  assert.deepEqual((await repo.findByRun(rid("run:1"))).map((r) => String(r.id)), ["envelope:1"]);
});

test("5 row-store DecisionCaptureLinkRepository saves/retrieves and finds by run", async () => {
  const repo = new RowStoreDecisionCaptureLinkRepository(new FakeRowStoreClient());
  const rec = decisionCaptureLink({ id: lid("link:1"), runId: rid("run:1"), athleteRef: "athlete:1", capture: cleanEnvelope().decisionCapture, createdAt: T("2026-06-30T08:01:07.000Z") });
  await repo.save(rec);
  assert.deepEqual(await repo.findById(lid("link:1")), rec);
  assert.deepEqual((await repo.findByRun(rid("run:1"))).map((r) => String(r.id)), ["link:1"]);
});

test("6/7 envelope repository goes through the row store + mapper and preserves the whitelist", async () => {
  const client = new FakeRowStoreClient();
  const repo = new RowStoreOperatorSessionEnvelopeRepository(client);
  await repo.save(operatorSessionEnvelopeRecord({ id: eid("envelope:1"), runId: rid("run:1"), athleteRef: "athlete:1", envelope: cleanEnvelope(), recordedAt: T("2026-06-30T08:01:06.000Z") }));
  const restored = await repo.findById(eid("envelope:1"));
  assert.ok(restored);
  for (const key of Object.keys(restored.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `restored envelope leaked key '${key}'`);
  }
  // stored as a flat row under the envelope table (no nested raw object)
  assert.ok(await client.get(OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope, "envelope:1"));
});

test("8 a polluted envelope-like record cannot smuggle unsafe fields through the row-store repository", async () => {
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
  const pollutedRecord = { id: eid("envelope:2"), runId: rid("run:2"), athleteRef: "athlete:1", envelope: polluted, recordedAt: T("2026-06-30T08:02:00.000Z") } as unknown as OperatorSessionEnvelopeRecord;

  const client = new FakeRowStoreClient();
  await new RowStoreOperatorSessionEnvelopeRepository(client).save(pollutedRecord);
  const row = await client.get(OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope, "envelope:2");
  assert.ok(row);
  const json = JSON.stringify(row).toLowerCase();
  for (const banned of [
    "rawoutcome", "energy felt low", "provideroutput", "raw provider completion", "hiddenreasoning",
    "chain-of-thought", "bearer", "sk-secret", "deliveryid", "delivery:zzz", "deliveredartifact",
    "eventrecordids", "evt:1", "athletedecision",
  ]) {
    assert.equal(json.includes(banned), false, `row-store repository must not persist '${banned}'`);
  }
});

// --- blob-store artifact store ---------------------------------------------------------------------

test("9/10/11/12 blob-store artifact store stores/retrieves opaque artifacts; payload + provenance preserved; FIT/TCX/CSV opaque", async () => {
  const store = new BlobStoreTrainingArtifactObjectStore(new FakeBlobStoreClient());
  for (const [ref, payload, source] of [
    ["object-store://raw/fit", FIT_BLOB, "garmin"],
    ["object-store://raw/tcx", TCX_BLOB, "garmin"],
    ["object-store://raw/csv", CSV_BLOB, "manual"],
  ] as const) {
    const stored = await store.put({ reference: ref, source, payload, mediaType: "application/octet-stream", filename: "x", createdAt: T("2026-06-29T07:00:00.000Z") });
    assert.equal(stored.reference, ref);
    const got = await store.get(ref);
    assert.ok(got);
    assert.equal(got.payload, payload, `payload for ${ref} unchanged`);
    assert.deepEqual(got, stored, "artifact round-trips through the blob store");
    const meta = await store.head(ref);
    assert.ok(meta);
    assert.equal("payload" in meta, false, "head exposes no payload");
  }
});

// --- determinism / safety / assembly ---------------------------------------------------------------

test("13/14 storage-backed adapters are deterministic + isolated with fake clients (no live DB/S3)", async () => {
  const a = new RowStoreTrainingSessionRepository(new FakeRowStoreClient());
  const b = new RowStoreTrainingSessionRepository(new FakeRowStoreClient());
  await a.save(trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "manual", recordedAt: T("2026-06-30T08:00:00.000Z") }));
  assert.equal(await b.findById(tsid("training:1")), undefined, "separate fake clients share nothing");
});

test("15/16 storage-backed adapters create no Evidence/ObservationSet/Signal/AthleteDecision and perform no delivery", async () => {
  const rowClient = new FakeRowStoreClient();
  await new RowStoreTrainingSessionRepository(rowClient).save(trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") }));
  const blobClient = new FakeBlobStoreClient();
  await new BlobStoreTrainingArtifactObjectStore(blobClient).put({ reference: "object-store://raw/x", source: "garmin", payload: FIT_BLOB, createdAt: T("2026-06-29T07:00:00.000Z") });
  const json = (
    JSON.stringify(await rowClient.list(OPERATOR_RUNTIME_TABLES.trainingSession)) + JSON.stringify(await blobClient.get("object-store://raw/x"))
  ).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "athletedecision", "metric", "measurement", "delivery", "lap", "trackpoint"]) {
    assert.equal(json.includes(derived), false, `storage-backed adapters must derive no '${derived}'`);
  }
});

test("assembly: createOperatorRuntimePersistenceRepositories wires the ports over injected clients (no live DB/S3)", async () => {
  // pg-shaped + s3-shaped fakes (no live services)
  const queryable: PostgresQueryable & { calls: number } = {
    calls: 0,
    async query() { this.calls++; return { rows: [] }; },
  };
  const s3: S3SendClient & { sent: string[] } = {
    sent: [],
    async send(command) { this.sent.push((command as { constructor: { name: string } }).constructor.name); return {}; },
  };
  const bundle = createOperatorRuntimePersistenceRepositories({ relational: { queryable }, objectStorage: { client: s3, bucket: "b" } });
  assert.deepEqual(Object.keys(bundle).sort(), ["artifactStore", "blobStore", "repositories", "rowStore"]);
  assert.deepEqual(Object.keys(bundle.repositories).sort(), ["decisionLinks", "envelopes", "runs", "trainingSessions"]);

  // the assembled repository really talks to the injected relational queryable
  await bundle.repositories.trainingSessions.save(trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "manual", recordedAt: T("2026-06-30T08:00:00.000Z") }));
  assert.ok(queryable.calls >= 1, "the repository issued a query through the injected relational client");

  // the assembled artifact store really talks to the injected object-storage send-client
  await bundle.artifactStore.put({ reference: "object-store://raw/x", source: "garmin", payload: FIT_BLOB, createdAt: T("2026-06-29T07:00:00.000Z") });
  assert.deepEqual(s3.sent, ["PutObjectCommand"]);
});

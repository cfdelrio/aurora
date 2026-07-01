// operator-runtime tests (Implementation 043-D1): fake-client contract + mapping proofs. Records map to
// vendor-neutral rows and opaque artifacts map to vendor-neutral blobs — with NO real DB/object-storage
// client and NO integration test. Mappings are whitelist-only: no unsafe field reaches storage.
//
//   row-store contract ≠ real DB adapter · blob-store contract ≠ real object-storage adapter ·
//   fake client ≠ integration test · storage row ≠ Evidence · artifact blob ≠ truth ·
//   OperatorSessionEnvelope row ≠ raw outcome · DecisionCaptureLink row ≠ AthleteDecision.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";

import {
  trainingSessionRecord,
  trainingSessionRawArtifactRef,
  operatorSessionRunRecord,
  operatorSessionEnvelopeRecord,
  decisionCaptureLink,
  storedTrainingArtifact,
  // D1 contracts
  FakeRowStoreClient,
  FakeBlobStoreClient,
  OPERATOR_RUNTIME_TABLES,
  trainingSessionToRow,
  rowToTrainingSession,
  operatorSessionRunToRow,
  rowToOperatorSessionRun,
  operatorSessionEnvelopeToRow,
  rowToOperatorSessionEnvelope,
  decisionCaptureLinkToRow,
  rowToDecisionCaptureLink,
  storedArtifactToBlob,
  blobToStoredArtifact,
} from "../index.ts";
import type {
  TrainingSessionId,
  OperatorSessionRunId,
  OperatorSessionEnvelopeRecordId,
  DecisionCaptureLinkId,
  OperatorSessionEnvelopeRecord,
} from "../index.ts";

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

// --- row contracts ---------------------------------------------------------------------------------

test("1/2 row-store fake writes/reads row-shaped training session metadata; round-trip creates no Evidence/ObservationSet", async () => {
  const client = new FakeRowStoreClient();
  const record = trainingSessionRecord({
    id: tsid("training:1"),
    athleteRef: "athlete:1",
    source: "garmin",
    artifact: trainingSessionRawArtifactRef({ source: "garmin", reference: "object-store://raw/abc", mediaType: "application/vnd.ant.fit", capturedAt: T("2026-06-29T07:00:00.000Z") }),
    label: "morning run",
    capturedAt: T("2026-06-29T07:00:00.000Z"),
    recordedAt: T("2026-06-30T08:00:00.000Z"),
  });

  const row = trainingSessionToRow(record);
  // flat scalar columns only
  for (const v of Object.values(row)) {
    assert.ok(v === null || ["string", "number", "boolean"].includes(typeof v), "rows must be flat scalars");
  }
  await client.insert(OPERATOR_RUNTIME_TABLES.trainingSession, row);
  const back = await client.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1");
  assert.ok(back);
  const restored = rowToTrainingSession(back);
  assert.deepEqual(restored, record, "training session record round-trips through the row store");

  const json = (JSON.stringify(row) + JSON.stringify(restored)).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "metric", "measurement"]) {
    assert.equal(json.includes(derived), false, `row mapping must derive no '${derived}'`);
  }
});

test("3 row mapping round-trips OperatorSessionRunRecord without delivery or AthleteDecision", async () => {
  const client = new FakeRowStoreClient();
  const record = operatorSessionRunRecord({
    id: rid("run:1"),
    athleteRef: "athlete:1",
    trainingSessionId: tsid("training:1"),
    status: "reflection-ready",
    startedAt: T("2026-06-30T08:01:00.000Z"),
    completedAt: T("2026-06-30T08:01:05.000Z"),
    envelopeRecordId: eid("envelope:1"),
  });
  await client.insert(OPERATOR_RUNTIME_TABLES.operatorSessionRun, operatorSessionRunToRow(record));
  const back = await client.get(OPERATOR_RUNTIME_TABLES.operatorSessionRun, "run:1");
  assert.ok(back);
  assert.deepEqual(rowToOperatorSessionRun(back), record);

  const json = JSON.stringify(operatorSessionRunToRow(record)).toLowerCase();
  for (const banned of ["delivery", "deliveryid", "deliveredartifact", "athletedecision", "decision", "channel", "recipient", "messagebody"]) {
    assert.equal(json.includes(banned), false, `run row must not contain '${banned}'`);
  }
});

test("4 row mapping round-trips OperatorSessionEnvelopeRecord with the OperatorSessionEnvelope only", async () => {
  const client = new FakeRowStoreClient();
  const record = operatorSessionEnvelopeRecord({
    id: eid("envelope:1"),
    runId: rid("run:1"),
    athleteRef: "athlete:1",
    envelope: cleanEnvelope(),
    recordedAt: T("2026-06-30T08:01:06.000Z"),
  });
  await client.insert(OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope, operatorSessionEnvelopeToRow(record));
  const back = await client.get(OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope, "envelope:1");
  assert.ok(back);
  const restored = rowToOperatorSessionEnvelope(back);
  assert.deepEqual(restored, record);
  for (const key of Object.keys(restored.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `restored envelope leaked key '${key}'`);
  }
});

test("5 a polluted envelope-like input cannot smuggle unsafe fields into row storage", () => {
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
  // a record-shaped object that bypassed the factory's whitelist
  const pollutedRecord = {
    id: eid("envelope:2"),
    runId: rid("run:2"),
    athleteRef: "athlete:1",
    envelope: polluted,
    recordedAt: T("2026-06-30T08:02:00.000Z"),
  } as unknown as OperatorSessionEnvelopeRecord;

  const row = operatorSessionEnvelopeToRow(pollutedRecord);
  const storedEnvelope = JSON.parse(row.envelope_json) as Record<string, unknown>;
  for (const key of Object.keys(storedEnvelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `row mapping leaked key '${key}'`);
  }
  const json = JSON.stringify(row).toLowerCase();
  for (const banned of [
    "rawoutcome", "energy felt low", "provideroutput", "raw provider completion", "hiddenreasoning",
    "chain-of-thought", "bearer", "sk-secret", "deliveryid", "delivery:zzz", "deliveredartifact",
    "eventrecordids", "evt:1", "athletedecision",
  ]) {
    assert.equal(json.includes(banned), false, `row must not contain '${banned}'`);
  }
});

test("6 DecisionCaptureLink row mapping remains invitation/link only, not an AthleteDecision", async () => {
  const client = new FakeRowStoreClient();
  const record = decisionCaptureLink({
    id: lid("link:1"),
    runId: rid("run:1"),
    athleteRef: "athlete:1",
    capture: { kind: "athlete-decision-invitation", athleteRef: "athlete:1", acceptableSources: ["athlete-declared", "athlete-reported"] },
    createdAt: T("2026-06-30T08:01:07.000Z"),
  });
  const row = decisionCaptureLinkToRow(record);
  assert.equal(row.capture_kind, "athlete-decision-invitation");
  await client.insert(OPERATOR_RUNTIME_TABLES.decisionCaptureLink, row);
  const back = await client.get(OPERATOR_RUNTIME_TABLES.decisionCaptureLink, "link:1");
  assert.ok(back);
  assert.deepEqual(rowToDecisionCaptureLink(back), record);

  const json = JSON.stringify(row).toLowerCase();
  for (const decisionish of ["choice", "decided", "resolution", "athletedecision"]) {
    assert.equal(json.includes(decisionish), false, `link row must not contain '${decisionish}'`);
  }
  // a row whose capture is not an invitation is rejected (it can never become an AthleteDecision)
  const notInvitation = { ...row, capture_kind: "athlete-decision" };
  assert.throws(() => rowToDecisionCaptureLink(notInvitation));
});

// --- blob contracts --------------------------------------------------------------------------------

test("7/8/9/10 blob-store fake writes/reads an opaque blob; payload + provenance preserved; FIT/TCX/CSV opaque", async () => {
  const client = new FakeBlobStoreClient();
  for (const [ref, payload, source] of [
    ["object-store://raw/fit", FIT_BLOB, "garmin"],
    ["object-store://raw/tcx", TCX_BLOB, "garmin"],
    ["object-store://raw/csv", CSV_BLOB, "manual"],
  ] as const) {
    const artifact = storedTrainingArtifact({ reference: ref, source, payload, mediaType: "application/octet-stream", filename: "x", createdAt: T("2026-06-29T07:00:00.000Z") });
    const blob = storedArtifactToBlob(artifact);
    await client.put(blob);
    const back = await client.get(ref);
    assert.ok(back);
    // 8. payload unchanged
    assert.equal(back.payload, payload, `payload for ${ref} must be returned unchanged`);
    // 9. metadata/provenance preserved through reconstruction
    const restored = blobToStoredArtifact(back);
    assert.deepEqual(restored, artifact, "artifact round-trips through the blob store");
    // 10. nothing parsed — metadata carries only provenance strings
    const meta = await client.head(ref);
    assert.ok(meta);
    assert.equal("payload" in meta, false, "blob metadata must not include the payload");
  }
});

test("11 blob mapping creates no Evidence / ObservationSet / Signal / AthleteDecision", () => {
  const artifact = storedTrainingArtifact({ reference: "object-store://raw/abc", source: "garmin", payload: FIT_BLOB, createdAt: T("2026-06-29T07:00:00.000Z") });
  const blob = storedArtifactToBlob(artifact);
  const json = (JSON.stringify(blob) + JSON.stringify(blobToStoredArtifact(blob))).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "athletedecision", "metric", "measurement", "lap", "trackpoint"]) {
    assert.equal(json.includes(derived), false, `blob mapping must derive no '${derived}'`);
  }
});

// --- determinism / isolation / no external service -------------------------------------------------

test("12 fake clients are deterministic and isolated per instance", async () => {
  const a = new FakeRowStoreClient();
  const b = new FakeRowStoreClient();
  await a.insert(OPERATOR_RUNTIME_TABLES.trainingSession, trainingSessionToRow(trainingSessionRecord({ id: tsid("training:1"), athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") })));
  assert.equal(await b.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1"), undefined, "row-store instances share nothing");

  // mutating a returned row must not affect the store
  const got = await a.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1");
  assert.ok(got);
  (got as { athlete_ref: string }).athlete_ref = "tampered";
  assert.equal((await a.get(OPERATOR_RUNTIME_TABLES.trainingSession, "training:1"))?.["athlete_ref"], "athlete:1");

  const blobA = new FakeBlobStoreClient();
  const blobB = new FakeBlobStoreClient();
  await blobA.put({ key: "k", payload: "p", metadata: { reference: "k", source: "manual", created_at_iso: "2026-06-29T07:00:00.000Z" } });
  assert.equal(await blobB.get("k"), undefined, "blob-store instances share nothing");
});

test("13/14 contracts need no real external service and no integration test (async in-memory)", async () => {
  // every operation above is async-but-in-memory — no connection, no network, no live DB/object store.
  const row = new FakeRowStoreClient();
  await row.insert(OPERATOR_RUNTIME_TABLES.trainingSession, trainingSessionToRow(trainingSessionRecord({ id: tsid("training:9"), athleteRef: "athlete:9", source: "manual", recordedAt: T("2026-06-30T08:00:00.000Z") })));
  assert.deepEqual((await row.findBy(OPERATOR_RUNTIME_TABLES.trainingSession, "athlete_ref", "athlete:9")).map((r) => r["id"]), ["training:9"]);
  const blob = new FakeBlobStoreClient();
  await blob.put({ key: "k2", payload: "opaque", metadata: { reference: "k2", source: "manual", created_at_iso: "2026-06-29T07:00:00.000Z" } });
  assert.equal((await blob.get("k2"))?.payload, "opaque");
});

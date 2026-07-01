// operator-runtime tests (Implementation 043-C1): functional proof of the operator-runtime persistence
// skeleton. Records are OPERATIONAL/runtime persistence — never domain truth, never delivery, never an
// AthleteDecision — and the envelope record stores the safe OperatorSessionEnvelope ONLY.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";
import type { OperatorSessionEnvelope } from "../../modules/application-orchestration/index.ts";

import {
  trainingSessionRecord,
  trainingSessionRawArtifactRef,
  InMemoryTrainingSessionRepository,
  operatorSessionRunRecord,
  InMemoryOperatorSessionRunRepository,
  operatorSessionEnvelopeRecord,
  InMemoryOperatorSessionEnvelopeRepository,
  decisionCaptureLink,
  InMemoryDecisionCaptureLinkRepository,
} from "../index.ts";
import type {
  TrainingSessionId,
  OperatorSessionRunId,
  OperatorSessionEnvelopeRecordId,
  DecisionCaptureLinkId,
} from "../index.ts";

const T = (iso: string) => timestamp(iso);
const ts = (id: string) => id as TrainingSessionId;
const rid = (id: string) => id as OperatorSessionRunId;
const eid = (id: string) => id as OperatorSessionEnvelopeRecordId;
const lid = (id: string) => id as DecisionCaptureLinkId;

// The whitelisted set of keys the persisted envelope may ever carry (Spec 040 redaction contract).
const ALLOWED_ENVELOPE_KEYS = new Set([
  "status",
  "deliveryWithheld",
  "rawRetained",
  "reflectionRef",
  "reflectionFlags",
  "decisionCapture",
  "admissionReason",
  "safeReason",
  "intakeStatus",
  "mediation",
  "traceSummary",
]);

function cleanEnvelope(): OperatorSessionEnvelope {
  return {
    status: "reflection-ready",
    deliveryWithheld: true,
    rawRetained: false,
    reflectionRef: "rendered-message-record:abc",
    reflectionFlags: {
      validationPassed: true,
      uncertaintyPreserved: true,
      limitationsPreserved: true,
      traceabilityPreserved: true,
    },
    decisionCapture: {
      kind: "athlete-decision-invitation",
      athleteRef: "athlete:1",
      acceptableSources: ["athlete-declared", "athlete-reported"],
    },
    intakeStatus: "accepted",
    mediation: { operatorRef: "operator:1" },
    traceSummary: {
      stoppedAt: "delivery-withheld",
      renderedMessageRecordId: "rendered-message-record:abc",
      displayEligibility: "eligible",
    },
  };
}

// --- async contract (043-E1) -----------------------------------------------------------------------

test("0 repository ports + in-memory adapters are Promise-based and resolve deterministically", async () => {
  const repo = new InMemoryTrainingSessionRepository();
  const rec = trainingSessionRecord({ id: ts("training:1"), athleteRef: "athlete:1", source: "manual", recordedAt: T("2026-06-30T08:00:00.000Z") });
  const saving = repo.save(rec);
  assert.ok(saving instanceof Promise, "save must return a Promise");
  await saving;
  const finding = repo.findById(ts("training:1"));
  assert.ok(finding instanceof Promise, "findById must return a Promise");
  const listing = repo.listByAthlete("athlete:1");
  assert.ok(listing instanceof Promise, "listByAthlete must return a Promise");
  assert.deepEqual(await finding, rec);
  assert.deepEqual((await listing).map((r) => String(r.id)), ["training:1"]);
});

// --- TrainingSessionRecord -------------------------------------------------------------------------

test("1/2/3 TrainingSessionRecord is saved/retrieved, preserves provenance, and is not Evidence/ObservationSet", async () => {
  const repo = new InMemoryTrainingSessionRepository();
  const rec = trainingSessionRecord({
    id: ts("training:1"),
    athleteRef: "athlete:1",
    source: "garmin",
    artifact: trainingSessionRawArtifactRef({
      source: "garmin",
      reference: "object-store://raw/abc",
      mediaType: "application/vnd.ant.fit",
      capturedAt: T("2026-06-29T07:00:00.000Z"),
    }),
    label: "morning run",
    capturedAt: T("2026-06-29T07:00:00.000Z"),
    recordedAt: T("2026-06-30T08:00:00.000Z"),
  });
  await repo.save(rec);

  const found = await repo.findById(ts("training:1"));
  assert.ok(found, "training session must be retrievable");
  assert.equal(found.athleteRef, "athlete:1");
  // provenance preserved (opaque ref + origin) — but it carries NO measurement/value/metric field.
  assert.equal(found.artifact?.reference, "object-store://raw/abc");
  assert.equal(found.source, "garmin");
  const keys = Object.keys(found);
  for (const evidenceish of ["evidence", "observations", "observationSet", "measurements", "metrics", "values", "samples"]) {
    assert.equal(keys.includes(evidenceish), false, `TrainingSessionRecord must not be Evidence/ObservationSet (has '${evidenceish}')`);
  }
});

test("4 TrainingSessionRawArtifactRef is provenance (opaque handle), not truth/content", () => {
  const ref = trainingSessionRawArtifactRef({ source: "manual", reference: "object-store://raw/xyz" });
  const keys = Object.keys(ref);
  // it locates + describes origin; it never embeds content or asserts correctness
  for (const truthish of ["content", "bytes", "payload", "data", "verified", "truth", "valid", "correct"]) {
    assert.equal(keys.includes(truthish), false, `artifact ref must be provenance only (has '${truthish}')`);
  }
  assert.equal(ref.reference, "object-store://raw/xyz");
  assert.equal(ref.source, "manual");
});

// --- OperatorSessionRunRecord ----------------------------------------------------------------------

test("5/6/7 OperatorSessionRunRecord is saved/retrieved, links a training session, and is not delivery", async () => {
  const repo = new InMemoryOperatorSessionRunRepository();
  const run = operatorSessionRunRecord({
    id: rid("run:1"),
    athleteRef: "athlete:1",
    trainingSessionId: ts("training:1"),
    status: "reflection-ready",
    startedAt: T("2026-06-30T08:01:00.000Z"),
    completedAt: T("2026-06-30T08:01:05.000Z"),
    envelopeRecordId: eid("envelope:1"),
  });
  await repo.save(run);

  const found = await repo.findById(rid("run:1"));
  assert.ok(found);
  assert.equal(String(found.trainingSessionId), "training:1", "run links to its training session");
  const keys = Object.keys(found);
  for (const deliveryish of ["delivery", "deliveryId", "deliveredArtifact", "channel", "recipient", "messageBody", "athleteDecision", "decision"]) {
    assert.equal(keys.includes(deliveryish), false, `run record must not be delivery/decision (has '${deliveryish}')`);
  }
  assert.deepEqual(
    (await repo.listByTrainingSession(ts("training:1"))).map((r) => String(r.id)),
    ["run:1"],
  );
});

// --- OperatorSessionEnvelopeRecord -----------------------------------------------------------------

test("8/9 OperatorSessionEnvelopeRecord is saved/retrieved and stores the OperatorSessionEnvelope only", async () => {
  const repo = new InMemoryOperatorSessionEnvelopeRepository();
  const rec = operatorSessionEnvelopeRecord({
    id: eid("envelope:1"),
    runId: rid("run:1"),
    athleteRef: "athlete:1",
    envelope: cleanEnvelope(),
    recordedAt: T("2026-06-30T08:01:06.000Z"),
  });
  await repo.save(rec);

  const found = await repo.findById(eid("envelope:1"));
  assert.ok(found);
  for (const key of Object.keys(found.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `stored envelope carries a non-whitelisted key '${key}'`);
  }
  assert.equal(found.envelope.deliveryWithheld, true);
  assert.equal(found.envelope.rawRetained, false);
});

test("10-17 the envelope record strips raw outcome / reflection text / provider output / hidden reasoning / secrets / delivery / eventRecordIds / AthleteDecision", async () => {
  // A polluted object cast as an envelope MUST NOT smuggle unsafe fields into storage.
  const polluted = {
    ...cleanEnvelope(),
    rawOutcome: { intake: { status: "accepted" }, reflection: { text: "energy felt low today" } },
    reflection: { text: "energy felt low today" },
    providerOutput: "raw provider completion body",
    hiddenReasoning: "chain-of-thought scratchpad",
    secret: "Bearer sk-secret-12345",
    deliveryId: "delivery:zzz",
    deliveredArtifact: { body: "rendered message body" },
    eventRecordIds: ["evt:1", "evt:2"],
    athleteDecision: { kind: "athlete-decision", choice: "rest" },
  } as unknown as OperatorSessionEnvelope;

  const repo = new InMemoryOperatorSessionEnvelopeRepository();
  await repo.save(
    operatorSessionEnvelopeRecord({
      id: eid("envelope:2"),
      runId: rid("run:2"),
      athleteRef: "athlete:1",
      envelope: polluted,
      recordedAt: T("2026-06-30T08:02:00.000Z"),
    }),
  );

  const found = await repo.findById(eid("envelope:2"));
  assert.ok(found);
  for (const key of Object.keys(found.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `stored envelope leaked key '${key}'`);
  }
  const json = JSON.stringify(found).toLowerCase();
  for (const banned of [
    "rawoutcome",
    "energy felt low",
    "provideroutput",
    "raw provider completion",
    "hiddenreasoning",
    "chain-of-thought",
    "bearer",
    "sk-secret",
    "deliveryid",
    "delivery:zzz",
    "deliveredartifact",
    "eventrecordids",
    "evt:1",
    "athletedecision",
  ]) {
    assert.equal(json.includes(banned), false, `stored envelope record must not contain '${banned}'`);
  }
});

// --- DecisionCaptureLink ---------------------------------------------------------------------------

test("18/19/20 DecisionCaptureLink is saved/retrieved and is not an AthleteDecision / decision source", async () => {
  const repo = new InMemoryDecisionCaptureLinkRepository();
  const link = decisionCaptureLink({
    id: lid("link:1"),
    runId: rid("run:1"),
    athleteRef: "athlete:1",
    capture: {
      kind: "athlete-decision-invitation",
      athleteRef: "athlete:1",
      acceptableSources: ["athlete-declared", "athlete-reported"],
    },
    createdAt: T("2026-06-30T08:01:07.000Z"),
  });
  await repo.save(link);

  const found = await repo.findById(lid("link:1"));
  assert.ok(found);
  // an invitation/ref only — never a decided value, resolution, or decision source
  assert.equal(found.capture.kind, "athlete-decision-invitation");
  const captureKeys = Object.keys(found.capture);
  for (const decisionish of ["choice", "decision", "decided", "value", "resolution", "outcome", "source", "evidence"]) {
    assert.equal(captureKeys.includes(decisionish), false, `capture must be an invitation, not a decision (has '${decisionish}')`);
  }
  // the factory refuses a non-invitation capture (it can never become an AthleteDecision)
  assert.throws(() =>
    decisionCaptureLink({
      id: lid("link:2"),
      runId: rid("run:1"),
      athleteRef: "athlete:1",
      capture: { kind: "athlete-decision", choice: "rest" } as never,
      createdAt: T("2026-06-30T08:01:08.000Z"),
    }),
  );
});

// --- listing + determinism/isolation ---------------------------------------------------------------

test("21 records can be listed by athlete / training-session / run", async () => {
  const sessions = new InMemoryTrainingSessionRepository();
  await sessions.save(trainingSessionRecord({ id: ts("training:1"), athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") }));
  await sessions.save(trainingSessionRecord({ id: ts("training:2"), athleteRef: "athlete:1", source: "manual", recordedAt: T("2026-06-30T08:00:01.000Z") }));
  await sessions.save(trainingSessionRecord({ id: ts("training:3"), athleteRef: "athlete:2", source: "manual", recordedAt: T("2026-06-30T08:00:02.000Z") }));
  assert.deepEqual((await sessions.listByAthlete("athlete:1")).map((r) => String(r.id)), ["training:1", "training:2"]);

  const envelopes = new InMemoryOperatorSessionEnvelopeRepository();
  await envelopes.save(operatorSessionEnvelopeRecord({ id: eid("envelope:1"), runId: rid("run:1"), athleteRef: "athlete:1", envelope: cleanEnvelope(), recordedAt: T("2026-06-30T08:01:06.000Z") }));
  assert.deepEqual((await envelopes.findByRun(rid("run:1"))).map((r) => String(r.id)), ["envelope:1"]);

  const links = new InMemoryDecisionCaptureLinkRepository();
  await links.save(decisionCaptureLink({ id: lid("link:1"), runId: rid("run:1"), athleteRef: "athlete:1", capture: cleanEnvelope().decisionCapture, createdAt: T("2026-06-30T08:01:07.000Z") }));
  assert.deepEqual((await links.findByRun(rid("run:1"))).map((r) => String(r.id)), ["link:1"]);
});

test("22 in-memory repositories are deterministic and isolated per instance (no shared/global state)", async () => {
  const a = new InMemoryTrainingSessionRepository();
  const b = new InMemoryTrainingSessionRepository();
  await a.save(trainingSessionRecord({ id: ts("training:1"), athleteRef: "athlete:1", source: "garmin", recordedAt: T("2026-06-30T08:00:00.000Z") }));
  // a second instance shares nothing
  assert.equal(await b.findById(ts("training:1")), undefined);

  // mutating a returned record must not affect the store (deep copies in and out)
  const got = await a.findById(ts("training:1"));
  assert.ok(got);
  (got as { athleteRef: string }).athleteRef = "tampered";
  assert.equal((await a.findById(ts("training:1")))?.athleteRef, "athlete:1");
});

test("23 no DB engine / object storage is used by the repositories (deterministic in-memory only)", async () => {
  // a smoke proof that construction + round-trip needs no external engine or connection
  const repo = new InMemoryOperatorSessionRunRepository();
  await repo.save(operatorSessionRunRecord({ id: rid("run:1"), athleteRef: "athlete:1", trainingSessionId: ts("training:1"), status: "renderable-inadmissible", startedAt: T("2026-06-30T08:01:00.000Z") }));
  assert.equal((await repo.findById(rid("run:1")))?.status, "renderable-inadmissible");
  // (the import-boundary guard test proves no DB/object-storage SDK is imported anywhere in the layer)
});

// operator-runtime tests (Implementation 043-C3): functional proof of the internal operator run service.
// It coordinates the C1 repositories and runs ONE session ONLY through the invokeOperatorSession seam (a
// fake conforming to that signature is injected here for determinism), persisting only safe records. It
// composes none of the core, parses no artifact, delivers nothing, and creates no AthleteDecision.
//
//   operator run service ≠ whole-core composer · invokeOperatorSession seam ≠ the underlying runtime ·
//   OperatorSessionEnvelope ≠ raw outcome · reflection-ready ≠ delivered · DecisionCaptureLink ≠ AthleteDecision.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  OperatorSessionEnvelope,
} from "../../modules/application-orchestration/index.ts";

import {
  trainingSessionRecord,
  InMemoryTrainingSessionRepository,
  InMemoryOperatorSessionRunRepository,
  InMemoryOperatorSessionEnvelopeRepository,
  InMemoryDecisionCaptureLinkRepository,
  runOperatorSession,
} from "../index.ts";
import type {
  TrainingSessionId,
  OperatorSessionRunId,
  OperatorSessionEnvelopeRecordId,
  DecisionCaptureLinkId,
  OperatorRunServiceDependencies,
  OperatorRunCommand,
  OperatorSessionInvoker,
} from "../index.ts";

const T = (iso: string) => timestamp(iso);
const tsid = (id: string) => id as TrainingSessionId;
const rid = (id: string) => id as OperatorSessionRunId;
const eid = (id: string) => id as OperatorSessionEnvelopeRecordId;
const lid = (id: string) => id as DecisionCaptureLinkId;

// the session command/deps are passed verbatim to the (here faked) seam, so opaque stubs suffice
const SESSION = {
  command: {} as OfflineReflectionRuntimeCommand<unknown>,
  deps: {} as OfflineReflectionRuntimeDependencies<unknown>,
};

function freshDeps(invoke?: OperatorSessionInvoker): OperatorRunServiceDependencies & {
  trainingSessions: InMemoryTrainingSessionRepository;
  runs: InMemoryOperatorSessionRunRepository;
  envelopes: InMemoryOperatorSessionEnvelopeRepository;
  decisionLinks: InMemoryDecisionCaptureLinkRepository;
} {
  return {
    trainingSessions: new InMemoryTrainingSessionRepository(),
    runs: new InMemoryOperatorSessionRunRepository(),
    envelopes: new InMemoryOperatorSessionEnvelopeRepository(),
    decisionLinks: new InMemoryDecisionCaptureLinkRepository(),
    ...(invoke !== undefined ? { invoke } : {}),
  };
}

async function seedTrainingSession(deps: { trainingSessions: InMemoryTrainingSessionRepository }): Promise<void> {
  await deps.trainingSessions.save(
    trainingSessionRecord({
      id: tsid("training:1"),
      athleteRef: "athlete:1",
      source: "garmin",
      recordedAt: T("2026-06-30T08:00:00.000Z"),
    }),
  );
}

function command(): OperatorRunCommand<unknown> {
  return {
    trainingSessionId: tsid("training:1"),
    runId: rid("run:1"),
    envelopeRecordId: eid("envelope:1"),
    decisionCaptureLinkId: lid("link:1"),
    startedAt: T("2026-06-30T08:01:00.000Z"),
    completedAt: T("2026-06-30T08:01:05.000Z"),
    recordedAt: T("2026-06-30T08:01:06.000Z"),
    session: SESSION,
  };
}

function reflectionReadyEnvelope(): OperatorSessionEnvelope {
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

const ALLOWED_ENVELOPE_KEYS = new Set([
  "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
  "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
]);

// --- core flow -------------------------------------------------------------------------------------

test("1/2/3/4/5/7 service loads a training session, runs via the seam, persists envelope+run+link, returns a safe result", async () => {
  let calls = 0;
  const invoke: OperatorSessionInvoker = async () => {
    calls++;
    return reflectionReadyEnvelope();
  };
  const deps = freshDeps(invoke);
  await seedTrainingSession(deps);

  const result = await runOperatorSession(command(), deps);

  assert.equal(calls, 1, "the service must run exactly once, through the injected seam");
  assert.equal(result.status, "completed");
  assert.equal(String(result.runRef), "run:1");
  assert.equal(String(result.envelopeRecordRef), "envelope:1");
  assert.equal(String(result.decisionCaptureLinkRef), "link:1");
  // 4. result carries the safe envelope + refs, never a raw outcome
  assert.ok(result.envelope);
  for (const key of Object.keys(result.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `result envelope leaked key '${key}'`);
  }
  // 7. deliveryWithheld preserved
  assert.equal(result.envelope.deliveryWithheld, true);

  // 1. a run was recorded; 3. exactly one envelope record persisted; 5. a link persisted
  const run = await deps.runs.findById(rid("run:1"));
  assert.ok(run);
  assert.equal(run.status, "reflection-ready", "run status reflects the envelope status");
  assert.equal(String(run.envelopeRecordId), "envelope:1");
  assert.deepEqual((await deps.envelopes.findByRun(rid("run:1"))).map((r) => String(r.id)), ["envelope:1"]);
  assert.deepEqual((await deps.decisionLinks.findByRun(rid("run:1"))).map((r) => String(r.id)), ["link:1"]);
});

test("6 service creates NO DecisionCaptureLink when the envelope has no decision-capture invitation/ref", async () => {
  // an envelope whose decision-capture is NOT an athlete-decision-invitation → the gate creates no link
  const noInvitation = {
    ...reflectionReadyEnvelope(),
    decisionCapture: { kind: "no-decision-capture", athleteRef: "athlete:1", acceptableSources: ["athlete-declared", "athlete-reported"] },
  } as unknown as OperatorSessionEnvelope;
  const invoke: OperatorSessionInvoker = async () => noInvitation;
  const deps = freshDeps(invoke);
  await seedTrainingSession(deps);

  const result = await runOperatorSession(command(), deps);
  assert.equal(result.status, "completed");
  assert.equal(result.decisionCaptureLinkRef, undefined, "no link ref when there is no invitation");
  assert.deepEqual(await deps.decisionLinks.findByRun(rid("run:1")), []);
  // the envelope record is still persisted
  assert.deepEqual((await deps.envelopes.findByRun(rid("run:1"))).map((r) => String(r.id)), ["envelope:1"]);
});

// --- safety: nothing unsafe persisted, nothing delivered, nothing derived ----------------------------

test("8/9/14-20 service persists no raw outcome / reflection text / provider output / hidden reasoning / secrets / delivery / eventRecordIds / AthleteDecision, and delivers nothing", async () => {
  // a polluted envelope (cast) must be stripped to the whitelist by the persistence path
  const polluted = {
    ...reflectionReadyEnvelope(),
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
  const invoke: OperatorSessionInvoker = async () => polluted;
  const deps = freshDeps(invoke);
  await seedTrainingSession(deps);

  const result = await runOperatorSession(command(), deps);

  // 8. nothing delivered — deliveryWithheld stays true; no delivery record repo even exists in the layer
  assert.equal(result.envelope?.deliveryWithheld, true);
  // 9./19./20. no AthleteDecision, delivery, or eventRecordIds anywhere
  const stored = await deps.envelopes.findById(eid("envelope:1"));
  assert.ok(stored);
  for (const key of Object.keys(stored.envelope)) {
    assert.ok(ALLOWED_ENVELOPE_KEYS.has(key), `stored envelope leaked key '${key}'`);
  }
  const json = (JSON.stringify(result) + JSON.stringify(stored) + JSON.stringify(await deps.runs.findById(rid("run:1")))).toLowerCase();
  for (const banned of [
    "rawoutcome", "energy felt low", "provideroutput", "raw provider completion", "hiddenreasoning",
    "chain-of-thought", "bearer", "sk-secret", "deliveryid", "delivery:zzz", "deliveredartifact",
    "eventrecordids", "evt:1", "athletedecision",
  ]) {
    assert.equal(json.includes(banned), false, `service path must not persist/return '${banned}'`);
  }
});

test("10/11/12/13 service parses no Garmin/FIT/TCX/CSV artifact and creates no Evidence/ObservationSet/Signal", async () => {
  const invoke: OperatorSessionInvoker = async () => reflectionReadyEnvelope();
  const deps = freshDeps(invoke);
  // a training session carrying an opaque garmin artifact ref
  await deps.trainingSessions.save(
    trainingSessionRecord({
      id: tsid("training:1"),
      athleteRef: "athlete:1",
      source: "garmin",
      recordedAt: T("2026-06-30T08:00:00.000Z"),
    }),
  );
  const result = await runOperatorSession(command(), deps);
  const json = (JSON.stringify(result) + JSON.stringify(await deps.envelopes.findById(eid("envelope:1"))) + JSON.stringify(await deps.runs.findById(rid("run:1")))).toLowerCase();
  for (const derived of ["evidence", "observationset", "observation", "signal", "metric", "measurement", "fit-record", "tcx", "lap", "trackpoint"]) {
    assert.equal(json.includes(derived), false, `service must derive no '${derived}' from artifacts`);
  }
});

// --- safe failure + determinism -------------------------------------------------------------------

test("21 service is deterministic with injected refs/timestamps/fake invocation", async () => {
  const invoke: OperatorSessionInvoker = async () => reflectionReadyEnvelope();
  const run = async () => {
    const deps = freshDeps(invoke);
    await seedTrainingSession(deps);
    return runOperatorSession(command(), deps);
  };
  const a = await run();
  const b = await run();
  assert.deepEqual(a, b, "same injected refs/timestamps/envelope produce an identical result");
});

test("22 service fails safely when the training session is missing — nothing invoked, nothing persisted", async () => {
  let calls = 0;
  const invoke: OperatorSessionInvoker = async () => {
    calls++;
    return reflectionReadyEnvelope();
  };
  const deps = freshDeps(invoke);
  // no training session seeded
  const result = await runOperatorSession(command(), deps);
  assert.equal(result.status, "training-session-not-found");
  assert.equal(result.runRef, undefined);
  assert.equal(result.envelope, undefined);
  assert.equal(calls, 0, "the seam must not be invoked when the training session is missing");
  assert.equal(await deps.runs.findById(rid("run:1")), undefined);
  assert.deepEqual(await deps.envelopes.findByRun(rid("run:1")), []);
  assert.deepEqual(await deps.decisionLinks.findByRun(rid("run:1")), []);
});

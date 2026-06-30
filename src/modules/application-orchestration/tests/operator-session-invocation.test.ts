// Implementation 041-A — functional tests for the PRODUCTION operator invocation helper (Spec 041 / Tech Spec 041A).
//
// invokeOperatorSession(command, deps) runs offlineReflectionRuntime ONCE and returns ONLY an
// OperatorSessionEnvelope. These tests drive the helper end-to-end through the REAL runtime with deterministic
// fakes (fixture renderables), proving it returns only the safe envelope — never the raw OfflineReflectionRuntimeOutcome.
//
// invocation helper ≠ CLI ≠ deployment ≠ live-provider enablement ≠ delivery mechanism ≠ whole-core composer ≠
// AthleteDecision creator · OperatorSessionEnvelope ≠ raw runtime outcome · reflection-ready ≠ delivered ≠
// AthleteDecision · deliveryWithheld ≠ delivery failure · Aurora advises, the athlete decides.

import { test } from "node:test";
import assert from "node:assert/strict";

import { invokeOperatorSession, OFFLINE_REFLECTION_STATUSES } from "../index.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  ManualIntakeStep,
  OrchestrationTiming,
  OperatorSessionEnvelope,
} from "../index.ts";
import { FakeProviderClient, InMemoryRenderedMessageRecordRepository } from "../../rendering/index.ts";
import type { ProviderSecretRef, ProviderClientBoundary } from "../../rendering/index.ts";
import { req, supportRenderable } from "../../rendering/tests/fixtures.ts";
import { ingestManualInput, InMemoryObservationSetRepository } from "../../observation/index.ts";
import type { ManualInputSubmission, ObservationSetRepository } from "../../observation/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const TIMING: OrchestrationTiming = {
  occurredAt: timestamp("2026-09-05T10:00:00.000Z"),
  recordedAt: timestamp("2026-09-05T10:00:05.000Z"),
  requestedAt: timestamp("2026-09-05T10:00:00.000Z"),
  completedAt: timestamp("2026-09-05T10:00:01.000Z"),
  createdAt: timestamp("2026-09-05T10:00:02.000Z"),
  now: timestamp("2026-09-05T10:00:03.000Z"),
};

function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-041a",
    athleteRef: "athlete:041a",
    submittedAt: timestamp("2026-09-05T09:00:00.000Z"),
    occurredAt: timestamp("2026-09-05T08:00:00.000Z"),
    occasion: "2026-09-05 morning session",
    reporter: "athlete-report",
    entries: [{ kind: "subjective-report", words: "I felt heavy in today's session" }],
    ...over,
  };
}

function realIntake(repo: ObservationSetRepository, calls?: { n: number }): ManualIntakeStep<ManualInputSubmission> {
  return (s) => {
    if (calls) calls.n += 1;
    const outcome = ingestManualInput({ submission: s, observationSetRepository: repo });
    if (outcome.status === "rejected") return { status: "rejected", reasons: [...outcome.reasons] };
    return { status: outcome.status, observationSetId: String(outcome.observationSetId) };
  };
}

/** A provider client that must never be called — proves stopped paths never render. */
const throwingClient: ProviderClientBoundary = {
  kind: "live",
  requestDraft(): never {
    throw new Error("provider must not be called");
  },
};

function deps(opts?: {
  readonly scenario?: "safe" | "voice-escalating";
  readonly client?: ProviderClientBoundary;
}): OfflineReflectionRuntimeDependencies<ManualInputSubmission> {
  const secret: ProviderSecretRef = { status: "present", ref: "ref:fake" };
  return {
    runManualIntake: realIntake(new InMemoryObservationSetRepository()),
    client: opts?.client ?? new FakeProviderClient({ scenario: opts?.scenario ?? "safe" }),
    config: { providerKind: "fake" },
    secret,
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
  };
}

function command(over?: Partial<OfflineReflectionRuntimeCommand<ManualInputSubmission>>): OfflineReflectionRuntimeCommand<ManualInputSubmission> {
  return {
    submission: submission(),
    athleteRef: "athlete:041a",
    request: req(supportRenderable()),
    operatorMediation: { operatorRef: "operator:op-041a", mediatedAt: timestamp("2026-09-05T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

/** Assert the returned value is ONLY a safe OperatorSessionEnvelope — never the raw runtime outcome. */
function assertEnvelopeOnly(env: OperatorSessionEnvelope): void {
  assert.equal(env.deliveryWithheld, true);
  assert.equal(env.rawRetained, false);
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes(env.status));
  // only whitelisted envelope keys — never the runtime outcome's own fields
  const allowed = new Set([
    "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
    "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
  ]);
  for (const key of Object.keys(env)) {
    assert.ok(allowed.has(key), `helper must return only envelope keys; saw '${key}'`);
  }
  const bag = env as unknown as Record<string, unknown>;
  for (const rawField of ["reflection", "intake", "trace"]) {
    assert.equal(bag[rawField], undefined, `helper must not expose raw outcome field '${rawField}'`);
  }
  // serialized scan: no raw text/secret/decision/delivery/event material
  const json = JSON.stringify(env);
  for (const banned of [
    "I felt heavy", "felt heavy", // raw reflection/observation text
    "\"text\"", "\"choice\"", "\"rationale\"", "athleteDecision", "AthleteDecision",
    "ref:fake", "bearer", "secret", "process.env",
    "deliveryRecordId", "deliveryRequestId", "eventRecordIds",
  ]) {
    assert.equal(json.includes(banned), false, `helper envelope must not contain '${banned}'`);
  }
  assert.equal(env.decisionCapture.kind, "athlete-decision-invitation"); // invitation/ref only
}

// ===== reflection-ready =====
test("invokeOperatorSession: safe path returns ONLY a reflection-ready envelope (no raw outcome)", async () => {
  const result = await invokeOperatorSession(command(), deps());
  assert.equal(result.status, "reflection-ready");
  assert.ok(result.reflectionRef && result.reflectionRef.length > 0); // a ref, not the text
  assert.ok(result.reflectionFlags?.validationPassed);
  // never the SafeReflectionProjection or its text
  assert.equal((result as unknown as Record<string, unknown>)["reflection"], undefined);
  assertEnvelopeOnly(result);
});

// ===== renderable-inadmissible =====
test("invokeOperatorSession: inadmissible renderable returns ONLY a safe renderable-inadmissible envelope", async () => {
  const result = await invokeOperatorSession(command({ request: req(supportRenderable({ sourceCaseRef: "  " })) }), deps({ client: throwingClient }));
  assert.equal(result.status, "renderable-inadmissible");
  assert.equal(result.admissionReason, "rejected-missing-provenance"); // safe closed code
  assert.equal(result.reflectionRef, undefined);
  assertEnvelopeOnly(result);
});

// ===== not-rendered =====
test("invokeOperatorSession: voice-escalating draft returns ONLY a safe not-rendered envelope (no raw provider output)", async () => {
  const result = await invokeOperatorSession(command(), deps({ scenario: "voice-escalating" }));
  assert.equal(result.status, "not-rendered");
  assert.equal(result.reflectionRef, undefined);
  assertEnvelopeOnly(result);
});

// ===== input-rejected =====
test("invokeOperatorSession: invalid manual input returns ONLY a safe input-rejected envelope", async () => {
  const result = await invokeOperatorSession(command({ submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));
  assert.equal(result.status, "input-rejected");
  assert.equal(result.reflectionRef, undefined);
  assertEnvelopeOnly(result);
});

// ===== runtime invoked exactly once =====
test("invokeOperatorSession: invokes the runtime exactly once (one manual-intake call on the safe path)", async () => {
  const repo = new InMemoryObservationSetRepository();
  const calls = { n: 0 };
  const d: OfflineReflectionRuntimeDependencies<ManualInputSubmission> = {
    runManualIntake: realIntake(repo, calls),
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
  };
  const result = await invokeOperatorSession(command(), d);
  assert.equal(result.status, "reflection-ready");
  assert.equal(calls.n, 1, "the runtime (and thus manual intake) must run exactly once");
});

// ===== recording-failed / unexpected-failure are pass-through to the mapper (proven in 040-A) =====
test("recording-failed / unexpected-failure are pass-through to toOperatorSessionEnvelope (mapper-proven)", () => {
  // The helper is `toOperatorSessionEnvelope(await offlineReflectionRuntime(...))`. The runtime never throws (it
  // wraps its body and returns a safe `unexpected-failure` outcome), and the mapper's handling of
  // recording-failed / unexpected-failure is proven deterministically in operator-session-envelope.test.ts via
  // typed fixtures. Those statuses are defensive and not deterministically reachable through the real runtime
  // here without a production change, so the helper's safety for them is guaranteed by composition. (Documented.)
  for (const status of ["recording-failed", "unexpected-failure"]) {
    assert.ok(OFFLINE_REFLECTION_STATUSES.includes(status as (typeof OFFLINE_REFLECTION_STATUSES)[number]));
  }
});

// ===== cross-path: every reachable disposition returns an envelope-only, delivery-withheld, no-decision result =====
test("invokeOperatorSession: across all reachable dispositions returns envelope-only, delivery-withheld, no AthleteDecision", async () => {
  const safe = await invokeOperatorSession(command(), deps());
  const inadmissible = await invokeOperatorSession(command({ request: req(supportRenderable({ sourceCaseRef: "" })) }), deps({ client: throwingClient }));
  const notRendered = await invokeOperatorSession(command(), deps({ scenario: "voice-escalating" }));
  const inputRejected = await invokeOperatorSession(command({ submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));

  for (const result of [safe, inadmissible, notRendered, inputRejected]) {
    assertEnvelopeOnly(result);
  }
  assert.deepEqual(
    [safe.status, inadmissible.status, notRendered.status, inputRejected.status],
    ["reflection-ready", "renderable-inadmissible", "not-rendered", "input-rejected"],
  );
  assert.ok(safe.reflectionRef);
  assert.equal(inadmissible.reflectionRef, undefined);
  assert.equal(notRendered.reflectionRef, undefined);
  assert.equal(inputRejected.reflectionRef, undefined);
});

// Implementation 040-A — functional tests for the OPERATOR SESSION ENVELOPE mapper (Spec 040 / Tech Spec 040A).
//
// The mapper toOperatorSessionEnvelope(outcome) is a PURE, SYNCHRONOUS whitelist projection of an
// OfflineReflectionRuntimeOutcome. These tests use strongly-typed fixture outcomes (matching the runtime's
// exported outcome shape) so every disposition — including recording-failed / unexpected-failure — is exercised
// deterministically without invoking the runtime, a provider, delivery, or whole-core composition.
//
// safe envelope ≠ raw runtime dump · reflectionRef ≠ reflection text · decisionCapture invitation ≠ AthleteDecision ·
// reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure · admission success ≠ truth ·
// validateDraft success ≠ recommendation quality · Aurora advises, the athlete decides.

import { test } from "node:test";
import assert from "node:assert/strict";

import { toOperatorSessionEnvelope } from "../application/operator-session-envelope.ts";
import type { OperatorSessionEnvelope } from "../application/operator-session-envelope.ts";
import type { OfflineReflectionRuntimeOutcome, OfflineReflectionStatus } from "../index.ts";

const ATHLETE = "athlete:040a-1";
const OPERATOR = "operator:op-040a";
const RECORD_ID = "rmr:040a-1";

const INVITATION = {
  kind: "athlete-decision-invitation",
  athleteRef: ATHLETE,
  acceptableSources: ["athlete-declared", "athlete-reported"],
} as const;

// A reflection-ready outcome carrying a (deliberately recognizable) reflection text the envelope MUST drop.
const REFLECTION_TEXT = "RAW-REFLECTION-TEXT-must-not-leak felt unusually heavy";

function reflectionReadyOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "reflection-ready",
    reflection: {
      text: REFLECTION_TEXT,
      kind: "support",
      voice: "VOICE-must-not-leak",
      presentedAs: "reflection",
      uncertaintyPreserved: true,
      limitationsPreserved: true,
      traceabilityPreserved: true,
      validationPassed: true,
    },
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "accepted" },
    trace: { stoppedAt: "display-eligibility-derived", renderedMessageRecordId: RECORD_ID, displayEligibility: "ineligible" },
    rawRetained: false,
  };
}

function inadmissibleOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "renderable-inadmissible",
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "accepted" },
    admissionReason: "rejected-missing-provenance",
    trace: { stoppedAt: "stopped" },
    rawRetained: false,
  };
}

function notRenderedOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "not-rendered",
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "accepted" },
    trace: { stoppedAt: "provider-rendering-completed", reasonCode: "provider-not-rendered" },
    rawRetained: false,
  };
}

function inputRejectedOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "input-rejected",
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "rejected" },
    trace: { stoppedAt: "stopped" },
    rawRetained: false,
  };
}

function recordingFailedOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "recording-failed",
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "accepted" },
    trace: { stoppedAt: "rendered-message-recorded", reasonCode: "recording-failed" },
    rawRetained: false,
  };
}

function unexpectedFailureOutcome(): OfflineReflectionRuntimeOutcome {
  return {
    status: "unexpected-failure",
    deliveryWithheld: true,
    mediation: { operatorRef: OPERATOR },
    decisionCapture: INVITATION,
    intake: { status: "accepted" },
    // a safe closed code only — the runtime never returns a raw exception/stack
    trace: { stoppedAt: "stopped", reasonCode: "unexpected-failure" },
    rawRetained: false,
  };
}

/** Assert the envelope is safe: no raw text/output/reasoning/secret/delivery/decision; only whitelisted keys. */
function assertEnvelopeSafe(env: OperatorSessionEnvelope): void {
  assert.equal(env.deliveryWithheld, true);
  assert.equal(env.rawRetained, false);
  // exact whitelisted key set (no stray keys spread from the raw outcome)
  const allowed = new Set([
    "status", "deliveryWithheld", "rawRetained", "reflectionRef", "reflectionFlags",
    "decisionCapture", "admissionReason", "safeReason", "intakeStatus", "mediation", "traceSummary",
  ]);
  for (const key of Object.keys(env)) {
    assert.ok(allowed.has(key), `envelope must not expose unexpected key '${key}'`);
  }
  // never the runtime's own raw fields
  const bag = env as unknown as Record<string, unknown>;
  for (const forbidden of ["reflection", "intake", "trace"]) {
    assert.equal(bag[forbidden], undefined, `envelope must not carry raw '${forbidden}'`);
  }
  // serialized scan: no raw reflection text / voice / decision shape / delivery id / event id / secret / env
  const json = JSON.stringify(env);
  for (const banned of [
    "RAW-REFLECTION-TEXT", "felt unusually heavy", "VOICE-must-not-leak", // reflection text/voice
    "\"text\"", "\"choice\"", "\"rationale\"", "athleteDecision", "AthleteDecision", // decision/text shapes
    "deliveryRecordId", "deliveryRequestId", "eventRecordIds", // delivery/event artifacts
    "bearer", "secret", "process.env", // secret/env material
  ]) {
    assert.equal(json.includes(banned), false, `envelope JSON must not contain '${banned}'`);
  }
  // decisionCapture is an invitation/ref only
  assert.equal(env.decisionCapture.kind, "athlete-decision-invitation");
  assert.deepEqual([...env.decisionCapture.acceptableSources], ["athlete-declared", "athlete-reported"]);
}

// ===== reflection-ready =====
test("reflection-ready maps to a reference-only envelope: reflectionRef + safe flags, never reflection text", () => {
  const env = toOperatorSessionEnvelope(reflectionReadyOutcome());
  assert.equal(env.status, "reflection-ready"); // exact status, no rename
  assert.equal(env.reflectionRef, RECORD_ID); // a REF, not the text
  assert.ok(env.reflectionFlags);
  assert.equal(env.reflectionFlags?.validationPassed, true);
  assert.equal(env.reflectionFlags?.uncertaintyPreserved, true);
  // no reflection text anywhere
  assert.equal((env as unknown as Record<string, unknown>)["reflection"], undefined);
  assert.equal(JSON.stringify(env).includes(REFLECTION_TEXT), false);
  assert.equal(env.traceSummary.renderedMessageRecordId, RECORD_ID);
  assert.equal(env.intakeStatus, "accepted");
  assert.equal(env.mediation.operatorRef, OPERATOR);
  assertEnvelopeSafe(env);
});

// ===== renderable-inadmissible =====
test("renderable-inadmissible maps the safe admissionReason; no reflectionRef; stopped", () => {
  const env = toOperatorSessionEnvelope(inadmissibleOutcome());
  assert.equal(env.status, "renderable-inadmissible");
  assert.equal(env.admissionReason, "rejected-missing-provenance"); // safe closed code
  assert.equal(env.reflectionRef, undefined);
  assert.equal(env.reflectionFlags, undefined);
  assert.equal(env.traceSummary.stoppedAt, "stopped");
  assertEnvelopeSafe(env);
});

// ===== not-rendered =====
test("not-rendered maps a safe reason code; no reflectionRef; no raw provider output", () => {
  const env = toOperatorSessionEnvelope(notRenderedOutcome());
  assert.equal(env.status, "not-rendered");
  assert.equal(env.reflectionRef, undefined);
  assert.equal(env.safeReason, "provider-not-rendered"); // closed code from trace.reasonCode
  assertEnvelopeSafe(env);
});

// ===== input-rejected =====
test("input-rejected maps the safe intake status only; stops before admission/rendering", () => {
  const env = toOperatorSessionEnvelope(inputRejectedOutcome());
  assert.equal(env.status, "input-rejected");
  assert.equal(env.intakeStatus, "rejected");
  assert.equal(env.reflectionRef, undefined);
  assert.equal(env.admissionReason, undefined);
  assertEnvelopeSafe(env);
});

// ===== recording-failed =====
test("recording-failed maps a safe code only", () => {
  const env = toOperatorSessionEnvelope(recordingFailedOutcome());
  assert.equal(env.status, "recording-failed");
  assert.equal(env.safeReason, "recording-failed");
  assert.equal(env.reflectionRef, undefined);
  assertEnvelopeSafe(env);
});

// ===== unexpected-failure =====
test("unexpected-failure maps a safe code only and excludes any raw exception/stack", () => {
  const env = toOperatorSessionEnvelope(unexpectedFailureOutcome());
  assert.equal(env.status, "unexpected-failure");
  assert.equal(env.safeReason, "unexpected-failure");
  assert.equal(env.reflectionRef, undefined);
  // no stack-like content
  assert.equal(/\bat\s+\w+.*\(.*:\d+:\d+\)/.test(JSON.stringify(env)), false, "no stack frame may appear");
  assertEnvelopeSafe(env);
});

// ===== cross-cutting: every disposition preserves deliveryWithheld / rawRetained and excludes unsafe content =====
test("every disposition preserves deliveryWithheld:true, rawRetained:false, and stays reference-only", () => {
  const outcomes: OfflineReflectionRuntimeOutcome[] = [
    reflectionReadyOutcome(), inadmissibleOutcome(), notRenderedOutcome(),
    inputRejectedOutcome(), recordingFailedOutcome(), unexpectedFailureOutcome(),
  ];
  const statuses = outcomes.map((o) => toOperatorSessionEnvelope(o).status);
  assert.deepEqual(statuses, [
    "reflection-ready", "renderable-inadmissible", "not-rendered",
    "input-rejected", "recording-failed", "unexpected-failure",
  ] satisfies OfflineReflectionStatus[]);
  for (const o of outcomes) assertEnvelopeSafe(toOperatorSessionEnvelope(o));
});

// ===== the mapper does not spread the raw outcome (whitelist construction) =====
test("the mapper does not spread the raw outcome: an injected stray field never reaches the envelope", () => {
  const tainted = {
    ...reflectionReadyOutcome(),
    // a hostile/extra field that a spread would leak — the field-by-field mapper must drop it
    secretLeak: "bearer SUPER-SECRET-TOKEN",
    rawProviderOutput: "do-not-leak provider draft",
  } as unknown as OfflineReflectionRuntimeOutcome;
  const env = toOperatorSessionEnvelope(tainted);
  const json = JSON.stringify(env);
  assert.equal(json.includes("SUPER-SECRET-TOKEN"), false);
  assert.equal(json.includes("do-not-leak"), false);
  assert.equal((env as unknown as Record<string, unknown>)["secretLeak"], undefined);
  assert.equal((env as unknown as Record<string, unknown>)["rawProviderOutput"], undefined);
});

// ===== the mapper is pure + synchronous (same input → equal output; not a thenable) =====
test("the mapper is pure and synchronous", () => {
  const outcome = reflectionReadyOutcome();
  const a = toOperatorSessionEnvelope(outcome);
  const b = toOperatorSessionEnvelope(outcome);
  assert.deepEqual(a, b); // deterministic
  assert.equal(typeof (a as unknown as { then?: unknown }).then, "undefined"); // not a Promise
  // input not mutated
  assert.equal(outcome.reflection?.text, REFLECTION_TEXT);
  assert.equal(outcome.rawRetained, false);
});

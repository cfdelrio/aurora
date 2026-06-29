// Implementation 039-A — the THIN OPERATOR INVOCATION SURFACE proof (Spec 039 / Tech Spec 039A).
//
// THIS IS A TEST HARNESS, NOT A PRODUCTION SERVICE. It proves the behavioral seam Spec 039 defines — "invoke the
// operator session runbook once" — entirely in test, with a LOCAL helper + LOCAL reference-only envelope type
// defined inside this file (no production code, no production helper/wrapper). The runtime outcome is already
// safe/redacted (rawRetained: false, ref-only trace, SafeReflectionProjection); this seam NARROWS it further to a
// reference-only invocation envelope (a reflection REF instead of reflection.text; a decision-capture invitation/
// ref; a ref-only trace summary). It calls only the existing offlineReflectionRuntime + admitExternalRenderable,
// unchanged. A future CLI/API/operator tool must sit BEHIND a seam like this — it is not one itself.
//
// invocation surface ≠ CLI ≠ script ≠ package command ≠ deployment ≠ API/UI ≠ live-provider enablement ≠
// delivery mechanism ≠ whole-core composer ≠ AthleteDecision creator · safe envelope ≠ raw runtime dump ·
// reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure · admission success ≠ truth ·
// validateDraft success ≠ recommendation quality · decision-capture invitation ≠ AthleteDecision ·
// Aurora advises, the athlete decides; Aurora never presents inference as fact.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";

import { recordObservationSet, contextualFrame, detectSignals, ingestManualInput, InMemoryObservationSetRepository } from "../observation/index.ts";
import type { ObservationSet, Observation, Signal, ManualInputSubmission, ObservationSetRepository } from "../observation/index.ts";
import { openHypothesis, attachSignalAsEvidence, hypothesisClaim, hypothesisScope, falsifier } from "../reasoning/index.ts";
import { UnderstandingProfile, reasoningOutcomeFrom, updateUnderstandingFromOutcome, produceUnderstandingAssessment, understandingDimension } from "../understanding/index.ts";
import { openDecisionSupportCase, evaluateDecisionSupportCase, verifyTraceability, claimStateOf, decisionOpportunity, purposeContext, noRisk } from "../decision-support/index.ts";
import type { CandidateSupport, TerminalOutput } from "../decision-support/index.ts";
import { renderableFromTerminalOutput, FakeProviderClient, InMemoryRenderedMessageRecordRepository } from "../rendering/index.ts";
import type { RenderingRequest, ProviderClientBoundary, ProviderSecretRef } from "../rendering/index.ts";
import { req, supportRenderable } from "../rendering/tests/fixtures.ts";
import {
  offlineReflectionRuntime,
  admitExternalRenderable,
  OFFLINE_REFLECTION_STATUSES,
} from "../application-orchestration/index.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  OfflineReflectionRuntimeOutcome,
  OfflineReflectionStatus,
  ManualIntakeStep,
  OrchestrationTiming,
} from "../application-orchestration/index.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:039a-1";
const OPERATOR = "operator:op-039a";
const SOURCE_CASE_REF = "case:039a";
const DIMENSION = understandingDimension("aerobic-response", "high-intensity");
const CANDIDATE: CandidateSupport = Object.freeze({ intent: "reflect", markers: Object.freeze([]), uncertaintyVisible: true });

const TIMING: OrchestrationTiming = {
  occurredAt: T("2026-09-04T10:00:00.000Z"),
  recordedAt: T("2026-09-04T10:00:05.000Z"),
  requestedAt: T("2026-09-04T10:00:00.000Z"),
  completedAt: T("2026-09-04T10:00:01.000Z"),
  createdAt: T("2026-09-04T10:00:02.000Z"),
  now: T("2026-09-04T10:00:03.000Z"),
};

// ===================================================================================================
// LOCAL, TEST-ONLY seam + envelope (Tech Spec 039A Decision 3 — [PROPOSED] names; NOT production types).
// The envelope is REFERENCE-ONLY: it narrows the (already-safe) runtime outcome to refs/codes only. It
// carries NO reflection.text, raw provider output, hidden reasoning, secret, delivery artifact, or AthleteDecision.
// ===================================================================================================
interface OperatorInvocationTraceSummary {
  readonly stoppedAt: string;
  readonly renderedMessageRecordId?: string;
  readonly displayEligibility?: "eligible" | "ineligible";
}

interface OperatorInvocationDecisionCaptureRef {
  readonly kind: "athlete-decision-invitation";
  readonly athleteRef: string;
  readonly acceptableSources: readonly ["athlete-declared", "athlete-reported"];
}

interface OperatorInvocationResult {
  readonly status: OfflineReflectionStatus; // EXACT runtime status — no rename
  readonly deliveryWithheld: true;
  readonly rawRetained: false;
  readonly reflectionRef?: string; // present only on reflection-ready; a REF, never reflection.text
  readonly decisionCapture: OperatorInvocationDecisionCaptureRef; // invitation/ref only — never an AthleteDecision
  readonly admissionReason?: string; // safe closed code, present only on renderable-inadmissible
  readonly safeReason?: string; // safe closed code on failure (from trace.reasonCode) — never raw content
  readonly traceSummary: OperatorInvocationTraceSummary; // ref-only subset
}

/**
 * The thin operator invocation seam (LOCAL test-only representation). It invokes the runbook ONCE: it admits
 * (Tier 2), runs the existing offlineReflectionRuntime, and NARROWS the safe outcome into a reference-only
 * envelope. It assembles nothing, reads no env, resolves no secret, calls no live provider/delivery, and creates
 * no AthleteDecision. It only normalizes + redacts; it adds no capability.
 */
function invokeThinOperatorSurface(
  command: OfflineReflectionRuntimeCommand<ManualInputSubmission>,
  deps: OfflineReflectionRuntimeDependencies<ManualInputSubmission>,
): Promise<OperatorInvocationResult> {
  return offlineReflectionRuntime(command, deps).then((outcome: OfflineReflectionRuntimeOutcome) => narrow(outcome));
}

/** Narrow the (already-safe) runtime outcome to a reference-only envelope. */
function narrow(outcome: OfflineReflectionRuntimeOutcome): OperatorInvocationResult {
  const traceSummary: OperatorInvocationTraceSummary = {
    stoppedAt: String(outcome.trace.stoppedAt),
    ...(outcome.trace.renderedMessageRecordId !== undefined ? { renderedMessageRecordId: outcome.trace.renderedMessageRecordId } : {}),
    ...(outcome.trace.displayEligibility !== undefined ? { displayEligibility: outcome.trace.displayEligibility } : {}),
  };
  return {
    status: outcome.status,
    deliveryWithheld: true,
    rawRetained: false,
    // a REF to the validated reflection record — NOT reflection.text (which the envelope deliberately drops)
    ...(outcome.status === "reflection-ready" && outcome.trace.renderedMessageRecordId !== undefined
      ? { reflectionRef: outcome.trace.renderedMessageRecordId }
      : {}),
    decisionCapture: {
      kind: outcome.decisionCapture.kind,
      athleteRef: outcome.decisionCapture.athleteRef,
      acceptableSources: outcome.decisionCapture.acceptableSources,
    },
    ...(outcome.admissionReason !== undefined ? { admissionReason: String(outcome.admissionReason) } : {}),
    ...(outcome.trace.reasonCode !== undefined ? { safeReason: outcome.trace.reasonCode } : {}),
    traceSummary,
  };
}

// ===================================================================================================
// Caller-assembled inputs (TEST-ONLY whole-core assembly; mirrors Impl 036-A/038-A). AC20 keeps this in
// __tests__/. The SEAM does not assemble — the test setup AROUND it does.
// ===================================================================================================
function buildObservationSet(): ObservationSet {
  return recordObservationSet({
    occasion: "session:2026-09-04-threshold-ride",
    expected: ["heart-rate"],
    observations: [
      {
        kind: "measured",
        provenance: { source: "device", captureTime: T("2026-09-04T07:00:00.000Z"), recordingTime: T("2026-09-04T07:05:00.000Z"), reference: "device:fit:hr" },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: { source: "athlete-report", captureTime: T("2026-09-04T08:00:00.000Z"), recordingTime: T("2026-09-04T08:01:00.000Z"), reference: "report:diary:1" },
        quality: { status: "complete", reason: "self-report captured verbatim" },
        words: "I felt unusually heavy",
      },
    ],
  });
}

function frameFor(observation: Observation): ReturnType<typeof contextualFrame> {
  switch (observation.kind) {
    case "measured":
      return contextualFrame({ purpose: "build aerobic base", sessionContext: "threshold ride", expectedRange: { quantity: "heart-rate", low: 120, high: 150, unit: "bpm" } });
    default:
      return contextualFrame({ purpose: "build aerobic base", sessionContext: "threshold ride" });
  }
}

/** Compose the whole-core chain → a real TerminalOutput (test-only; mirrors Impl 006/036-A/038-A). */
function assembleRealTerminalOutput(): TerminalOutput {
  const set = buildObservationSet();
  const signals = detectSignals({ set, frameFor }).filter((d): d is Signal => d.outcome === "signal");
  const measuredSignal = signals.find((s) => s.questionTopic.startsWith("deviation:"));
  assert.ok(measuredSignal, "the measured HR deviation must produce a Signal");

  const hypothesis = attachSignalAsEvidence({
    hypothesis: openHypothesis({
      claim: hypothesisClaim("high-intensity sessions may raise this athlete's aerobic heart-rate response", "response-pattern"),
      scope: hypothesisScope({ statement: "threshold rides", timescale: "single session" }),
      athleteRef: ATHLETE,
      falsifiers: [falsifier({ condition: "a flat HR response on retest", status: "declared" })],
    }),
    signal: measuredSignal,
    direction: "supports",
    reasoningNote: "HR ran above the expected range while the athlete reported heaviness",
    at: T("2026-09-04T09:00:00.000Z"),
  });

  const outcome = reasoningOutcomeFrom({ hypothesis, dimension: DIMENSION, conditions: ["high-intensity threshold ride"], at: T("2026-09-04T09:05:00.000Z") });
  const profile = updateUnderstandingFromOutcome({ profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }), outcome });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });
  assert.ok(assessment, "a dimension assessment must be produced");

  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({ choice: "reflect on the heaviness vs. push the next session", whySupportMayHelp: "a non-obvious fatigue pattern is worth surfacing, not directing", athleteRef: ATHLETE, at: T("2026-09-04T09:10:00.000Z") }),
      assessment,
      purpose: purposeContext("declared", "build aerobic base for a July race"),
      risk: noRisk(),
      candidate: CANDIDATE,
      trace: verifyTraceability(hypothesis),
      claimState: claimStateOf(hypothesis),
    }),
  });
  const terminal = evaluated.selectedOutput;
  assert.ok(terminal, "the decision-support case must select a terminal output");
  assert.equal(terminal.outcome, "support");
  return terminal;
}

function assemblePreferredRenderingRequest(): RenderingRequest {
  const terminal = assembleRealTerminalOutput();
  const renderable = renderableFromTerminalOutput({ sourceCaseRef: SOURCE_CASE_REF, output: terminal });
  return req(renderable);
}

function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-039a",
    athleteRef: ATHLETE,
    submittedAt: T("2026-09-04T09:00:00.000Z"),
    occurredAt: T("2026-09-04T08:00:00.000Z"),
    occasion: "2026-09-04 morning session",
    reporter: "athlete-report",
    entries: [{ kind: "subjective-report", words: "I felt heavy in today's session" }],
    ...over,
  };
}

function realIntake(repo: ObservationSetRepository): ManualIntakeStep<ManualInputSubmission> {
  return (s) => {
    const outcome = ingestManualInput({ submission: s, observationSetRepository: repo });
    if (outcome.status === "rejected") return { status: "rejected", reasons: [...outcome.reasons] };
    return { status: outcome.status, observationSetId: String(outcome.observationSetId) };
  };
}

/** A provider client that must never be called — proves no live/render path on stopped invocations. */
const throwingClient: ProviderClientBoundary = {
  kind: "live",
  requestDraft(): never {
    throw new Error("provider must not be called");
  },
};

// Default deps: deterministic FAKE provider, fake secret ref, in-memory repos. No live provider, no real secret,
// no process.env, no delivery sink.
function deps(opts?: { readonly scenario?: "safe" | "voice-escalating"; readonly client?: ProviderClientBoundary }): OfflineReflectionRuntimeDependencies<ManualInputSubmission> {
  const secret: ProviderSecretRef = { status: "present", ref: "ref:fake" };
  return {
    runManualIntake: realIntake(new InMemoryObservationSetRepository()),
    client: opts?.client ?? (new FakeProviderClient({ scenario: opts?.scenario ?? "safe" }) as ProviderClientBoundary),
    config: { providerKind: "fake" },
    secret,
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
  };
}

function command(request: RenderingRequest, over: Partial<OfflineReflectionRuntimeCommand<ManualInputSubmission>> = {}): OfflineReflectionRuntimeCommand<ManualInputSubmission> {
  return {
    submission: submission(),
    athleteRef: ATHLETE,
    request,
    operatorMediation: { operatorRef: OPERATOR, mediatedAt: T("2026-09-04T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

/** Assert an envelope carries no unsafe content (no raw output, reasoning, secrets, delivery artifact, decision). */
function assertEnvelopeSafe(result: OperatorInvocationResult): void {
  assert.equal(result.rawRetained, false);
  assert.equal(result.deliveryWithheld, true);
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes(result.status));
  const json = JSON.stringify(result).toLowerCase();
  for (const banned of [
    "athletedecision", "\"choice\"", "\"rationale\"", // no AthleteDecision shape
    "ref:fake", "bearer", "secret", "process.env", // no secret/env material
    "i felt", "felt unusually heavy", // no raw reflection/observation text leaked
    "deliveryrecord", "deliveryrequest", // no delivery artifact
  ]) {
    assert.equal(json.includes(banned), false, `invocation envelope must not contain '${banned}'`);
  }
  // the decision-capture is an invitation/ref ONLY
  assert.equal(result.decisionCapture.kind, "athlete-decision-invitation");
  assert.deepEqual([...result.decisionCapture.acceptableSources], ["athlete-declared", "athlete-reported"]);
}

// ===== Case 1 — safe invocation → reflection-ready envelope (delivery withheld, no decision) =====
test("safe invocation: invokeThinOperatorSurface → reflection-ready envelope (delivery withheld, no AthleteDecision)", async () => {
  const request = assemblePreferredRenderingRequest();
  assert.equal(admitExternalRenderable(request).admitted, true); // admission success ≠ truth

  const result = await invokeThinOperatorSurface(command(request), deps());

  assert.equal(result.status, "reflection-ready"); // exact runtime status, not renamed
  assert.equal(result.deliveryWithheld, true); // reflection-ready ≠ delivered
  assert.equal(result.rawRetained, false);
  // exposes a safe reflection REF, never the reflection text
  assert.ok(result.reflectionRef && result.reflectionRef.length > 0, "a safe reflection ref is exposed");
  assert.equal((result as unknown as Record<string, unknown>)["reflection"], undefined); // no SafeReflectionProjection embedded
  assert.equal((result as unknown as Record<string, unknown>)["text"], undefined); // no reflection text
  assertEnvelopeSafe(result);
});

// ===== Case 2 — envelope exposes decision-capture invitation/ref only, never an AthleteDecision =====
test("safe invocation: envelope exposes the decision-capture invitation/ref only — never an AthleteDecision", async () => {
  const result = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest()), deps());
  assert.equal(result.decisionCapture.kind, "athlete-decision-invitation"); // decision-capture invitation ≠ AthleteDecision
  assert.equal(result.decisionCapture.athleteRef, ATHLETE);
  assert.notEqual(result.decisionCapture.athleteRef, OPERATOR); // operator mediation ≠ athlete decision
  const bag = result as unknown as Record<string, unknown>;
  assert.equal(bag["athleteDecision"], undefined);
  assert.equal(bag["decision"], undefined);
});

// ===== Case 3 — renderable-inadmissible → safe admission reason; no provider/render/decision =====
test("inadmissible invocation: renderable-inadmissible envelope carries a safe admission reason; no render/decision", async () => {
  const request = req(supportRenderable({ sourceCaseRef: "  " })); // fails Tier 2 (missing provenance)
  assert.equal(admitExternalRenderable(request).admitted, false);

  const result = await invokeThinOperatorSurface(command(request), deps({ client: throwingClient }));
  assert.equal(result.status, "renderable-inadmissible");
  assert.equal(result.admissionReason, "rejected-missing-provenance"); // safe closed code
  assert.equal(result.reflectionRef, undefined);
  assert.equal(result.traceSummary.stoppedAt, "stopped");
  assert.equal(result.traceSummary.renderedMessageRecordId, undefined);
  assertEnvelopeSafe(result);
});

// ===== Case 4 — not-rendered → no raw provider output; no delivery; no decision =====
test("not-rendered invocation: maps without raw provider output; no delivery; no AthleteDecision", async () => {
  const request = assemblePreferredRenderingRequest();
  assert.equal(admitExternalRenderable(request).admitted, true);

  const result = await invokeThinOperatorSurface(command(request), deps({ scenario: "voice-escalating" }));
  assert.equal(result.status, "not-rendered"); // validateDraft failed closed; validateDraft success ≠ recommendation quality
  assert.equal(result.reflectionRef, undefined);
  assertEnvelopeSafe(result);
});

// ===== Case 5 — input-rejected → stops before admission/rendering; maps safely =====
test("input-rejected invocation: stops before admission/rendering; maps safely; provider never called", async () => {
  const request = assemblePreferredRenderingRequest();
  const result = await invokeThinOperatorSurface(command(request, { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));
  assert.equal(result.status, "input-rejected");
  assert.equal(result.reflectionRef, undefined);
  assertEnvelopeSafe(result);
});

// ===== Case 6 — no-live / no-default-secret / no-delivery: the throwing client is never called on stops, =====
//        and the safe-path fake provider is the ONLY provider; no real secret/env/delivery path exists.
test("no live provider / real secret / process.env / delivery sink is required by the seam", async () => {
  // stopped paths never call the provider (throwing client proves it)
  const inadmissible = await invokeThinOperatorSurface(command(req(supportRenderable({ sourceCaseRef: "" }))), deps({ client: throwingClient }));
  const rejected = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest(), { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));
  // the safe path uses only the deterministic FAKE provider
  const safe = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest()), deps());
  for (const result of [inadmissible, rejected, safe]) {
    assertEnvelopeSafe(result); // excludes secret/env/delivery material
    assert.equal(result.deliveryWithheld, true);
  }
  assert.deepEqual([inadmissible.status, rejected.status, safe.status], ["renderable-inadmissible", "input-rejected", "reflection-ready"]);
});

// ===== Case 7 — cross-path: every disposition stays delivery-withheld and creates no AthleteDecision =====
test("cross-path: every invocation disposition is delivery-withheld, reference-only, and creates no AthleteDecision", async () => {
  const safe = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest()), deps());
  const inadmissible = await invokeThinOperatorSurface(command(req(supportRenderable({ sourceCaseRef: "" }))), deps({ client: throwingClient }));
  const notRendered = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest()), deps({ scenario: "voice-escalating" }));
  const inputRejected = await invokeThinOperatorSurface(command(assemblePreferredRenderingRequest(), { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));

  for (const result of [safe, inadmissible, notRendered, inputRejected]) {
    assert.equal(result.deliveryWithheld, true); // deliveryWithheld ≠ delivery failure
    assert.equal(result.rawRetained, false);
    assertEnvelopeSafe(result);
  }
  // statuses preserved exactly (no rename); only reflection-ready exposes a reflection ref
  assert.deepEqual(
    [safe.status, inadmissible.status, notRendered.status, inputRejected.status],
    ["reflection-ready", "renderable-inadmissible", "not-rendered", "input-rejected"],
  );
  assert.ok(safe.reflectionRef);
  assert.equal(inadmissible.reflectionRef, undefined);
  assert.equal(notRendered.reflectionRef, undefined);
  assert.equal(inputRejected.reflectionRef, undefined);
});

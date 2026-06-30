// Implementation 036-A — the FIRST operator-mediated reflection session harness (Spec 036 / Tech Spec 036A).
//
// THIS IS A TEST HARNESS, NOT A PRODUCTION SERVICE. It lives in the neutral src/modules/__tests__/ root on
// purpose: it composes the whole-core responsible-reflection chain (observation → reasoning → understanding →
// decision-support) to obtain a REAL TerminalOutput, then maps it through the production rendering surface
// (renderableFromTerminalOutput) into a RenderingRequest, and drives the existing product runtime
// (offlineReflectionRuntime) end-to-end. AC20 keeps whole-core composition test-only — so this whole-core
// assembly is allowed HERE and forbidden in any production file. It adds NO production code.
//
// It proves the first session: a trusted operator supplies athlete manual input + a caller-assembled,
// admission-gated RenderingRequest; the runtime admits (Tier 2) before rendering, validates downstream
// (Tier 3 validateDraft), produces a safe inference-marked reflection, withholds delivery, and creates no
// AthleteDecision (only an invitation). Operator mediation ≠ athlete decision.
//
// operator-mediated session ≠ operator smoke · session harness ≠ production whole-core composer ·
// test harness ≠ production service · caller-supplied RenderingRequest ≠ truth · admitted ≠ evidence-backed fact ·
// validateDraft ≠ recommendation quality · reflection-ready ≠ delivered · delivery withheld ≠ delivery failure ·
// decision-capture prompt ≠ AthleteDecision · AC20 seam ≠ whole-core composer.

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
  ManualIntakeStep,
  OrchestrationTiming,
} from "../application-orchestration/index.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:036a-1";
const SOURCE_CASE_REF = "case:036a";
const DIMENSION = understandingDimension("aerobic-response", "high-intensity");
const CANDIDATE: CandidateSupport = Object.freeze({ intent: "reflect", markers: Object.freeze([]), uncertaintyVisible: true });

const TIMING: OrchestrationTiming = {
  occurredAt: T("2026-09-01T10:00:00.000Z"),
  recordedAt: T("2026-09-01T10:00:05.000Z"),
  requestedAt: T("2026-09-01T10:00:00.000Z"),
  completedAt: T("2026-09-01T10:00:01.000Z"),
  createdAt: T("2026-09-01T10:00:02.000Z"),
  now: T("2026-09-01T10:00:03.000Z"),
};

// ---------------------------------------------------------------------------------------------------
// Operator step 1 (TEST-ONLY whole-core assembly): run the Impl 006 chain to a REAL TerminalOutput.
// This is exactly the kind of composition AC20 keeps in the test harness; a production file may NOT do it.
// ---------------------------------------------------------------------------------------------------
function buildObservationSet(): ObservationSet {
  return recordObservationSet({
    occasion: "session:2026-09-01-threshold-ride",
    expected: ["heart-rate"],
    observations: [
      {
        kind: "measured",
        provenance: { source: "device", captureTime: T("2026-09-01T07:00:00.000Z"), recordingTime: T("2026-09-01T07:05:00.000Z"), reference: "device:fit:hr" },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: { source: "athlete-report", captureTime: T("2026-09-01T08:00:00.000Z"), recordingTime: T("2026-09-01T08:01:00.000Z"), reference: "report:diary:1" },
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

/** Compose the whole-core chain → a real TerminalOutput (test-only; mirrors the Impl 006 harness). */
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
    at: T("2026-09-01T09:00:00.000Z"),
  });

  const outcome = reasoningOutcomeFrom({ hypothesis, dimension: DIMENSION, conditions: ["high-intensity threshold ride"], at: T("2026-09-01T09:05:00.000Z") });
  const profile = updateUnderstandingFromOutcome({ profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }), outcome });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });
  assert.ok(assessment, "a dimension assessment must be produced");

  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({ choice: "reflect on the heaviness vs. push the next session", whySupportMayHelp: "a non-obvious fatigue pattern is worth surfacing, not directing", athleteRef: ATHLETE, at: T("2026-09-01T09:10:00.000Z") }),
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
  assert.equal(terminal.outcome, "support", "the chain must yield a DecisionSupport (Reflection), not a prescription");
  return terminal;
}

// Operator step 2: map the real TerminalOutput through the PRODUCTION rendering surface → RenderingRequest.
function assembleRenderingRequestFromRealTerminalOutput(): RenderingRequest {
  const terminal = assembleRealTerminalOutput();
  const renderable = renderableFromTerminalOutput({ sourceCaseRef: SOURCE_CASE_REF, output: terminal });
  return req(renderable);
}

// ---------------------------------------------------------------------------------------------------
// Operator-mediated runtime wiring (deterministic; no live provider, no real secret, no process env).
// ---------------------------------------------------------------------------------------------------
function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-036a",
    athleteRef: ATHLETE,
    submittedAt: T("2026-09-01T09:00:00.000Z"),
    occurredAt: T("2026-09-01T08:00:00.000Z"),
    occasion: "2026-09-01 morning session",
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

/** A provider client that must never be called — proves the render path is not reached. */
const throwingClient: ProviderClientBoundary = {
  kind: "live",
  requestDraft(): never {
    throw new Error("provider must not be called");
  },
};

function deps(opts?: {
  readonly scenario?: "safe" | "voice-escalating";
  readonly secretStatus?: "present" | "missing";
  readonly client?: ProviderClientBoundary;
}): OfflineReflectionRuntimeDependencies<ManualInputSubmission> {
  const secret: ProviderSecretRef = { status: opts?.secretStatus ?? "present", ref: "ref:fake" };
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

function command(request: RenderingRequest, over: Partial<OfflineReflectionRuntimeCommand<ManualInputSubmission>> = {}): OfflineReflectionRuntimeCommand<ManualInputSubmission> {
  return {
    submission: submission(),
    athleteRef: ATHLETE,
    request,
    operatorMediation: { operatorRef: "operator:op-036a", mediatedAt: T("2026-09-01T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

// ===== Case 1 — safe session: real TerminalOutput → renderable → admitted → rendered + validated =====
test("safe session: real TerminalOutput → renderableFromTerminalOutput → reflection-ready (delivery withheld)", async () => {
  const request = assembleRenderingRequestFromRealTerminalOutput();
  // the renderable was caller-assembled from a real TerminalOutput (preferred assembly path)
  assert.equal(request.renderable.sourceCaseRef, SOURCE_CASE_REF);
  assert.equal(request.renderable.kind, "support");
  // admission passes BEFORE the runtime renders
  assert.equal(admitExternalRenderable(request).admitted, true);

  const out = await offlineReflectionRuntime(command(request), deps());
  assert.equal(out.status, "reflection-ready");
  assert.ok(out.reflection, "a reflection must be produced");
  assert.equal(out.reflection?.presentedAs, "reflection");
  assert.equal(out.reflection?.validationPassed, true); // downstream validateDraft was exercised
  assert.ok((out.reflection?.text.length ?? 0) > 0);
  assert.equal(out.deliveryWithheld, true);
  // no AthleteDecision — only an invitation; operator mediation is not the athlete's decision
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation");
  assert.equal(out.decisionCapture.athleteRef, ATHLETE);
  assert.equal(out.mediation.operatorRef, "operator:op-036a");
  assert.notEqual(out.decisionCapture.athleteRef, out.mediation.operatorRef);
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["athletedecision", "\"choice\"", "\"rationale\"", "ref:fake", "bearer", "process.env"]) {
    assert.equal(json.includes(banned), false, `safe session result must not contain '${banned}'`);
  }
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes(out.status));
});

// ===== Case 2 — inadmissible renderable: stops before provider/validate/delivery =====
test("inadmissible renderable: renderable-inadmissible; provider never called; no reflection/decision", async () => {
  const request = req(supportRenderable({ sourceCaseRef: "  " })); // fails Tier 2 (missing provenance)
  assert.equal(admitExternalRenderable(request).admitted, false);

  const out = await offlineReflectionRuntime(command(request), deps({ client: throwingClient }));
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-missing-provenance"); // safe closed code
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.trace.stoppedAt, "stopped"); // stopped before orchestration/rendering
  assert.equal(out.trace.renderedMessageRecordId, undefined);
  assert.equal(out.reflection, undefined);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // no AthleteDecision created
});

// ===== Case 3 — admitted but invalid draft: fails closed through existing validateDraft behavior =====
test("admitted renderable + voice-escalating provider → not-rendered (validateDraft fails closed)", async () => {
  const request = assembleRenderingRequestFromRealTerminalOutput();
  assert.equal(admitExternalRenderable(request).admitted, true); // admission succeeds, rendering path starts

  const out = await offlineReflectionRuntime(command(request), deps({ scenario: "voice-escalating" }));
  assert.equal(out.status, "not-rendered"); // validateDraft rejected the draft → fail-closed
  assert.equal(out.reflection, undefined);
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // still no AthleteDecision
});

// ===== Case 4 — manual input rejected: stops before admission/rendering =====
test("rejected manual input → input-rejected; stops before admission/rendering; provider never called", async () => {
  const request = assembleRenderingRequestFromRealTerminalOutput();
  // invalid submission (missing athleteRef) → intake rejects before admission; throwing client proves no render
  const out = await offlineReflectionRuntime(command(request, { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));
  assert.equal(out.status, "input-rejected");
  assert.equal(out.reflection, undefined);
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation");
});

// ===== whole-core assembly stays test-only; the session never delivers and never decides for the athlete =====
test("the session never delivers and never creates an AthleteDecision across all paths", async () => {
  const safe = await offlineReflectionRuntime(command(assembleRenderingRequestFromRealTerminalOutput()), deps());
  const inadmissible = await offlineReflectionRuntime(command(req(supportRenderable({ sourceCaseRef: "" }))), deps({ client: throwingClient }));
  for (const out of [safe, inadmissible]) {
    assert.equal(out.deliveryWithheld, true); // delivery withheld ≠ delivery failure
    assert.equal(out.trace.deliveryRecordId, undefined);
    assert.equal(out.trace.deliveryRequestId, undefined);
    assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // decision-capture prompt ≠ AthleteDecision
  }
});

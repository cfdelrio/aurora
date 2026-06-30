// Implementation 038-A — the OPERATOR SESSION RUNBOOK proof (Spec 038 / Tech Spec 038A).
//
// THIS IS A TEST HARNESS, NOT A PRODUCTION SERVICE. It proves, in ONE executable place, the operator session
// runbook defined by Spec 038: a trusted operator assembles athlete manual input + a caller-assembled
// RenderingRequest (PREFERRED path: a real TerminalOutput → renderableFromTerminalOutput), runs the existing
// offlineReflectionRuntime (Tier 2 admitExternalRenderable before rendering; Tier 3 validateDraft downstream),
// reviews the delivery-withheld reflection, and — only LATER and EXPLICITLY — captures an athlete-declared /
// athlete-reported decision linked to the session, re-entering only as a SubjectiveObservation. It binds the
// 036-A session paths and the 037-A capture half into the single runbook sequence with per-outcome operator
// obligations. It adds NO production code; AC20 keeps whole-core composition test-only, so the whole-core
// assembly is allowed HERE and forbidden in any production file. It mirrors docs/runbooks/operator-session-runbook.md.
//
// runbook ≠ CLI · runbook ≠ runtime shell · runbook ≠ deployment · caller assembly ≠ truth ·
// TerminalOutput preferred path ≠ production whole-core composer · admission success ≠ evidence-backed fact ·
// validateDraft success ≠ recommendation quality · reflection-ready ≠ delivered · reflection-ready ≠ AthleteDecision ·
// operator mediation ≠ athlete decision · operator scribe ≠ decision source · silence ≠ decision ·
// decision feedback ≠ Signal/Evidence · Aurora advises, the athlete decides; Aurora never presents inference as fact.

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

import {
  AthleteDecisionRecord,
  InMemoryAthleteDecisionRecordRepository,
  athleteDecision,
  decisionChoice,
  decisionContext,
  decisionRationale,
  recordAthleteDecision,
} from "../athlete/index.ts";
import type { AthleteDecision, DecisionReportSource } from "../athlete/index.ts";

import { decisionAsObservation } from "./decision-observation-adapter.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:038a-1";
const OPERATOR = "operator:op-038a";
// The reflection's sourceCaseRef IS a decision-support case ref — the honest link from a post-reflection
// decision back to the session that informed it (Spec 038 §4.14, Tech Spec 037A §2.6).
const SOURCE_CASE_REF = "case:038a";
const PURPOSE_VERSION_REF = "pv:038a";
const DIMENSION = understandingDimension("aerobic-response", "high-intensity");
const CANDIDATE: CandidateSupport = Object.freeze({ intent: "reflect", markers: Object.freeze([]), uncertaintyVisible: true });

const TIMING: OrchestrationTiming = {
  occurredAt: T("2026-09-03T10:00:00.000Z"),
  recordedAt: T("2026-09-03T10:00:05.000Z"),
  requestedAt: T("2026-09-03T10:00:00.000Z"),
  completedAt: T("2026-09-03T10:00:01.000Z"),
  createdAt: T("2026-09-03T10:00:02.000Z"),
  now: T("2026-09-03T10:00:03.000Z"),
};

// ---------------------------------------------------------------------------------------------------
// RUNBOOK STEP 1 — PREFERRED caller assembly (TEST-ONLY whole-core composition; mirrors Impl 036-A).
// AC20 keeps this whole-core assembly in __tests__/; a production file may NOT do it. Reproduced inline
// because the 036-A/037-A harness helpers are not exported (Tech Spec 038A §"required test harness").
// ---------------------------------------------------------------------------------------------------
function buildObservationSet(): ObservationSet {
  return recordObservationSet({
    occasion: "session:2026-09-03-threshold-ride",
    expected: ["heart-rate"],
    observations: [
      {
        kind: "measured",
        provenance: { source: "device", captureTime: T("2026-09-03T07:00:00.000Z"), recordingTime: T("2026-09-03T07:05:00.000Z"), reference: "device:fit:hr" },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: { source: "athlete-report", captureTime: T("2026-09-03T08:00:00.000Z"), recordingTime: T("2026-09-03T08:01:00.000Z"), reference: "report:diary:1" },
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

/** Compose the whole-core chain → a real, domain-approved TerminalOutput (test-only; mirrors Impl 006/036-A). */
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
    at: T("2026-09-03T09:00:00.000Z"),
  });

  const outcome = reasoningOutcomeFrom({ hypothesis, dimension: DIMENSION, conditions: ["high-intensity threshold ride"], at: T("2026-09-03T09:05:00.000Z") });
  const profile = updateUnderstandingFromOutcome({ profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }), outcome });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });
  assert.ok(assessment, "a dimension assessment must be produced");

  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({ choice: "reflect on the heaviness vs. push the next session", whySupportMayHelp: "a non-obvious fatigue pattern is worth surfacing, not directing", athleteRef: ATHLETE, at: T("2026-09-03T09:10:00.000Z") }),
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

/** PREFERRED assembly: map the real TerminalOutput through the production rendering surface → RenderingRequest. */
function assemblePreferredRenderingRequest(): RenderingRequest {
  const terminal = assembleRealTerminalOutput();
  const renderable = renderableFromTerminalOutput({ sourceCaseRef: SOURCE_CASE_REF, output: terminal });
  return req(renderable);
}

// ---------------------------------------------------------------------------------------------------
// RUNBOOK STEP 2 — runtime wiring (deterministic; no live provider, no real secret, no process.env, no sink).
// ---------------------------------------------------------------------------------------------------
function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-038a",
    athleteRef: ATHLETE,
    submittedAt: T("2026-09-03T09:00:00.000Z"),
    occurredAt: T("2026-09-03T08:00:00.000Z"),
    occasion: "2026-09-03 morning session",
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

/** A provider client that must never be called — proves a stopped runbook path never renders. */
const throwingClient: ProviderClientBoundary = {
  kind: "live",
  requestDraft(): never {
    throw new Error("provider must not be called");
  },
};

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
    operatorMediation: { operatorRef: OPERATOR, mediatedAt: T("2026-09-03T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

// ---------------------------------------------------------------------------------------------------
// RUNBOOK STEP 3 — later, explicit decision capture (documented usage of existing machinery; Impl 037-A).
// ---------------------------------------------------------------------------------------------------
function laterDecision(opts: { readonly source: DecisionReportSource; readonly action: string; readonly reasons?: readonly string[] }): AthleteDecision {
  return athleteDecision({
    athleteRef: ATHLETE,
    choice: decisionChoice({ action: opts.action }),
    rationale: decisionRationale(opts.reasons ?? []),
    context: decisionContext({ decisionSupportCaseRef: SOURCE_CASE_REF, purposeVersionRef: PURPOSE_VERSION_REF }),
    source: opts.source,
    at: T("2026-09-03T18:00:00.000Z"),
  });
}

// ===== RUNBOOK — safe path: caller assembly → admitted → reflection-ready → withheld → no decision =====
test("runbook safe path: preferred caller assembly → reflection-ready (delivery withheld, no AthleteDecision)", async () => {
  // STEP 1 — PREFERRED caller assembly: TerminalOutput → renderableFromTerminalOutput → RenderingRequest
  const request = assemblePreferredRenderingRequest();
  assert.equal(request.renderable.sourceCaseRef, SOURCE_CASE_REF); // caller-assembled (provenance present)
  assert.equal(request.renderable.kind, "support");

  // STEP 2a — admission runs BEFORE rendering (Tier 2 structural gate)
  assert.equal(admitExternalRenderable(request).admitted, true); // admitted ≠ evidence-backed fact

  // STEP 2b — run the runtime; Tier 3 validateDraft remains downstream
  const out = await offlineReflectionRuntime(command(request), deps());
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes(out.status));
  assert.equal(out.status, "reflection-ready");
  assert.equal(out.reflection?.validationPassed, true); // validateDraft was exercised (Tier 3); ≠ recommendation quality
  assert.ok((out.reflection?.text.length ?? 0) > 0);

  // delivery withheld; the runtime created NO AthleteDecision (only an invitation)
  assert.equal(out.deliveryWithheld, true); // reflection-ready ≠ delivered
  assert.equal(out.trace.deliveryRecordId, undefined);
  assert.equal(out.trace.deliveryRequestId, undefined);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // reflection-ready ≠ AthleteDecision
  assert.deepEqual([...out.decisionCapture.acceptableSources], ["athlete-declared", "athlete-reported"]);
  // operator mediation is recorded but is NOT the athlete's decision
  assert.equal(out.mediation.operatorRef, OPERATOR);
  assert.notEqual(out.decisionCapture.athleteRef, out.mediation.operatorRef);

  // no decision record, no secret/raw content leaked
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["athletedecision", "\"choice\"", "\"rationale\"", "ref:fake", "bearer", "process.env"]) {
    assert.equal(json.includes(banned), false, `safe runbook outcome must not contain '${banned}'`);
  }
});

// ===== RUNBOOK — reflection-ready then LATER explicit athlete-declared capture, session-linked =====
test("runbook later capture: athlete-declared decision recorded AFTER reflection-ready, linked to the session", async () => {
  const out = await offlineReflectionRuntime(command(assemblePreferredRenderingRequest()), deps());
  assert.equal(out.status, "reflection-ready");
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // invitation only

  // capture happens AFTERWARD, as its own explicit athlete step (operator did not decide)
  const repo = new InMemoryAthleteDecisionRecordRepository();
  assert.equal(repo.exists(ATHLETE), false); // nothing created by the runtime

  const decision = laterDecision({ source: "athlete-declared", action: "I'll keep tomorrow easy and reassess Thursday", reasons: ["respecting the heaviness Aurora surfaced"] });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });
  repo.save(record);

  assert.equal(decision.source, "athlete-declared");
  assert.equal(decision.context.decisionSupportCaseRef, SOURCE_CASE_REF); // linked to the reflection/session
  const reloaded = repo.findByAthleteRef(ATHLETE);
  assert.ok(reloaded?.byId(decision.id));

  // feedback re-enters ONLY as a SubjectiveObservation — never Signal/Evidence
  const obs = decisionAsObservation(decision);
  assert.equal(obs.kind, "subjective");
  assert.equal(obs.inquiryRef, SOURCE_CASE_REF);
  const bag = obs as unknown as Record<string, unknown>;
  assert.equal(bag["outcome"], undefined); // not a Signal
  assert.equal(bag["direction"], undefined); // not a Signal
  assert.equal(bag["trace"], undefined); // not an Evidence/Signal trace
});

// ===== RUNBOOK — later athlete-reported capture; operator is scribe only, never the source =====
test("runbook later capture: athlete-reported decision recorded; operator is scribe only, not the source", () => {
  // operator transcribes what the athlete reported; the honest source is the ATHLETE (athlete-reported)
  const decision = laterDecision({ source: "athlete-reported", action: "the athlete reported they rode easy after the reflection", reasons: ["legs still heavy"] });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });

  assert.equal(decision.source, "athlete-reported");
  assert.notEqual(decision.source, "athlete-declared");
  assert.equal(decision.athleteRef, ATHLETE);
  assert.notEqual(decision.athleteRef, OPERATOR); // operator scribe ≠ decision source
  assert.ok(record.byId(decision.id));
  assert.equal(decision.context.decisionSupportCaseRef, SOURCE_CASE_REF);
  // the decision object carries no operator/source-of-truth field
  const dbag = decision as unknown as Record<string, unknown>;
  assert.equal(dbag["operatorRef"], undefined);
  assert.equal(dbag["operator"], undefined);
});

// ===== RUNBOOK — renderable-inadmissible STOPS the runbook (no render/validate/deliver/decision) =====
test("runbook stop: renderable-inadmissible → operator stops; no provider/render/delivery/AthleteDecision", async () => {
  // a renderable missing provenance fails Tier 2; the operator must NOT strip safety to force admission
  const request = req(supportRenderable({ sourceCaseRef: "  " }));
  assert.equal(admitExternalRenderable(request).admitted, false);

  const out = await offlineReflectionRuntime(command(request), deps({ client: throwingClient }));
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-missing-provenance"); // safe closed code
  assert.equal(out.trace.stoppedAt, "stopped"); // stopped before orchestration/rendering
  assert.equal(out.trace.renderedMessageRecordId, undefined);
  assert.equal(out.reflection, undefined);
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // no AthleteDecision
});

// ===== RUNBOOK — not-rendered STOPS the runbook (provider output not safe; no delivery/decision) =====
test("runbook stop: not-rendered → operator stops/revises; provider output not safe; no delivery/AthleteDecision", async () => {
  const request = assemblePreferredRenderingRequest();
  assert.equal(admitExternalRenderable(request).admitted, true); // admission succeeds; rendering path starts

  // a voice-escalating provider draft fails the downstream validateDraft → fail-closed
  const out = await offlineReflectionRuntime(command(request), deps({ scenario: "voice-escalating" }));
  assert.equal(out.status, "not-rendered");
  assert.equal(out.reflection, undefined); // provider output is NOT safe
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // no AthleteDecision
});

// ===== RUNBOOK — input-rejected STOPS the runbook (before admission/rendering) =====
test("runbook stop: input-rejected → operator corrects input; no admission/rendering/AthleteDecision", async () => {
  const request = assemblePreferredRenderingRequest();
  // invalid manual input (missing athleteRef) → intake rejects before admission; throwing client proves no render
  const out = await offlineReflectionRuntime(command(request, { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));
  assert.equal(out.status, "input-rejected");
  assert.equal(out.reflection, undefined);
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // no AthleteDecision
});

// ===== RUNBOOK — silence/no-response creates NO AthleteDecision =====
test("runbook silence: after reflection-ready, no athlete response means no AthleteDecision", async () => {
  const out = await offlineReflectionRuntime(command(assemblePreferredRenderingRequest()), deps());
  assert.equal(out.status, "reflection-ready");
  // the athlete says nothing: no athleteDecision(...) is called, the record stays empty; nothing fabricates one
  const record = AthleteDecisionRecord.empty(ATHLETE);
  assert.equal(record.decisions.length, 0);
  assert.equal(record.active().length, 0);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // still only an invitation
});

// ===== RUNBOOK — cross-path invariant: never delivers, never creates an AthleteDecision =====
test("runbook invariant: across all dispositions, delivery is withheld and no AthleteDecision is created", async () => {
  const safe = await offlineReflectionRuntime(command(assemblePreferredRenderingRequest()), deps());
  const inadmissible = await offlineReflectionRuntime(command(req(supportRenderable({ sourceCaseRef: "" }))), deps({ client: throwingClient }));
  const notRendered = await offlineReflectionRuntime(command(assemblePreferredRenderingRequest()), deps({ scenario: "voice-escalating" }));
  const inputRejected = await offlineReflectionRuntime(command(assemblePreferredRenderingRequest(), { submission: submission({ athleteRef: "" }) }), deps({ client: throwingClient }));

  for (const out of [safe, inadmissible, notRendered, inputRejected]) {
    assert.equal(out.deliveryWithheld, true); // delivery withheld ≠ delivery failure
    assert.equal(out.trace.deliveryRecordId, undefined);
    assert.equal(out.trace.deliveryRequestId, undefined);
    assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // decision-capture prompt ≠ AthleteDecision
    const json = JSON.stringify(out).toLowerCase();
    assert.equal(json.includes("athletedecision"), false);
  }
  // exactly the closed, expected statuses — no renamed/invented status
  assert.deepEqual(
    [safe.status, inadmissible.status, notRendered.status, inputRejected.status],
    ["reflection-ready", "renderable-inadmissible", "not-rendered", "input-rejected"],
  );
});

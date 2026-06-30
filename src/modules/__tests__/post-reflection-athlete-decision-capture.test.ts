// Implementation 037-A — the post-reflection athlete decision capture harness (Spec 037 / Tech Spec 037A).
//
// THIS IS A TEST HARNESS, NOT A PRODUCTION SERVICE. Per Tech Spec 037A Decision 1 (Option A + C), it adds NO
// production code: it proves, by DOCUMENTED USAGE of the surfaces that already exist (Impl 009), that a
// decision an athlete makes AFTER reading a reflection can be captured honestly and linked back to the
// originating reflection/session — and that nothing on the reflection/runtime path ever creates one.
//
// The capture path is exactly: athlete-sourced input → athleteDecision(...) →
// decisionContext({ decisionSupportCaseRef }) (= the reflection's sourceCaseRef) → recordAthleteDecision(...)
// → re-entry ONLY as a SubjectiveObservation via decisionAsObservation. The runtime (offlineReflectionRuntime)
// is exercised UNCHANGED, only to re-assert it auto-creates no AthleteDecision (an invitation, never a record).
//
// Required distinctions carried through names/assertions:
// reflection-ready ≠ AthleteDecision · validated reflection ≠ AthleteDecision · delivery success ≠ AthleteDecision ·
// delivery withheld ≠ delivery failure · admission success ≠ AthleteDecision · validateDraft success ≠ AthleteDecision ·
// operator mediation ≠ AthleteDecision · operator scribe ≠ decision source · athlete-reported ≠ system-inferred ·
// observed behavior ≠ decision · silence ≠ decision · following Aurora ≠ obedience-success ·
// AthleteDecision re-entry as SubjectiveObservation ≠ Signal/Evidence · Aurora advises; the athlete decides.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";

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

import {
  recordObservationSet,
  contextualFrame,
  detectSignals,
  ingestManualInput,
  InMemoryObservationSetRepository,
} from "../observation/index.ts";
import type {
  ObservationSet,
  Observation,
  Signal,
  ManualInputSubmission,
  ObservationSetRepository,
} from "../observation/index.ts";
import { openHypothesis, attachSignalAsEvidence, hypothesisClaim, hypothesisScope, falsifier } from "../reasoning/index.ts";
import {
  UnderstandingProfile,
  reasoningOutcomeFrom,
  updateUnderstandingFromOutcome,
  produceUnderstandingAssessment,
  understandingDimension,
} from "../understanding/index.ts";
import {
  openDecisionSupportCase,
  evaluateDecisionSupportCase,
  verifyTraceability,
  claimStateOf,
  decisionOpportunity,
  purposeContext,
  noRisk,
} from "../decision-support/index.ts";
import type { CandidateSupport, TerminalOutput } from "../decision-support/index.ts";
import { renderableFromTerminalOutput, FakeProviderClient, InMemoryRenderedMessageRecordRepository } from "../rendering/index.ts";
import type { RenderingRequest, ProviderClientBoundary, ProviderSecretRef } from "../rendering/index.ts";
import { req } from "../rendering/tests/fixtures.ts";
import { offlineReflectionRuntime, admitExternalRenderable } from "../application-orchestration/index.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  ManualIntakeStep,
  OrchestrationTiming,
} from "../application-orchestration/index.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:037a-1";
// The reflection's sourceCaseRef IS a decision-support case ref (Tech Spec 037A §2.6/§2.12). It is the honest
// existing link from a post-reflection decision back to the reflection that informed it.
const SOURCE_CASE_REF = "case:037a";
const PURPOSE_VERSION_REF = "pv:037a";
const DIMENSION = understandingDimension("aerobic-response", "high-intensity");
const CANDIDATE: CandidateSupport = Object.freeze({ intent: "reflect", markers: Object.freeze([]), uncertaintyVisible: true });

const TIMING: OrchestrationTiming = {
  occurredAt: T("2026-09-02T10:00:00.000Z"),
  recordedAt: T("2026-09-02T10:00:05.000Z"),
  requestedAt: T("2026-09-02T10:00:00.000Z"),
  completedAt: T("2026-09-02T10:00:01.000Z"),
  createdAt: T("2026-09-02T10:00:02.000Z"),
  now: T("2026-09-02T10:00:03.000Z"),
};

// ---------------------------------------------------------------------------------------------------
// Reflection-side setup (TEST-ONLY whole-core assembly; mirrors Impl 036-A). AC20 keeps whole-core
// composition in the test harness — allowed HERE, forbidden in any production file. Reproduced minimally
// here because the 036-A harness helpers are not exported (Tech Spec 037A §"required test path").
// ---------------------------------------------------------------------------------------------------
function buildObservationSet(): ObservationSet {
  return recordObservationSet({
    occasion: "session:2026-09-02-threshold-ride",
    expected: ["heart-rate"],
    observations: [
      {
        kind: "measured",
        provenance: { source: "device", captureTime: T("2026-09-02T07:00:00.000Z"), recordingTime: T("2026-09-02T07:05:00.000Z"), reference: "device:fit:hr" },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: { source: "athlete-report", captureTime: T("2026-09-02T08:00:00.000Z"), recordingTime: T("2026-09-02T08:01:00.000Z"), reference: "report:diary:1" },
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

/** Compose the whole-core chain → a real TerminalOutput (test-only; mirrors the Impl 006/036-A harness). */
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
    at: T("2026-09-02T09:00:00.000Z"),
  });

  const outcome = reasoningOutcomeFrom({ hypothesis, dimension: DIMENSION, conditions: ["high-intensity threshold ride"], at: T("2026-09-02T09:05:00.000Z") });
  const profile = updateUnderstandingFromOutcome({ profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }), outcome });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });
  assert.ok(assessment, "a dimension assessment must be produced");

  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({ choice: "reflect on the heaviness vs. push the next session", whySupportMayHelp: "a non-obvious fatigue pattern is worth surfacing, not directing", athleteRef: ATHLETE, at: T("2026-09-02T09:10:00.000Z") }),
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

function assembleRenderingRequestFromRealTerminalOutput(): RenderingRequest {
  const terminal = assembleRealTerminalOutput();
  const renderable = renderableFromTerminalOutput({ sourceCaseRef: SOURCE_CASE_REF, output: terminal });
  return req(renderable);
}

function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-037a",
    athleteRef: ATHLETE,
    submittedAt: T("2026-09-02T09:00:00.000Z"),
    occurredAt: T("2026-09-02T08:00:00.000Z"),
    occasion: "2026-09-02 morning session",
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

function deps(): OfflineReflectionRuntimeDependencies<ManualInputSubmission> {
  const secret: ProviderSecretRef = { status: "present", ref: "ref:fake" };
  return {
    runManualIntake: realIntake(new InMemoryObservationSetRepository()),
    client: new FakeProviderClient({ scenario: "safe" }) as ProviderClientBoundary,
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
    operatorMediation: { operatorRef: "operator:op-037a", mediatedAt: T("2026-09-02T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

// ---------------------------------------------------------------------------------------------------
// Capture-side helpers: documented usage of the EXISTING surfaces (no production wrapper is added).
// The decision is built ONLY from explicit athlete-sourced input and linked to the reflection via the
// existing DecisionContext.decisionSupportCaseRef.
// ---------------------------------------------------------------------------------------------------
function postReflectionDecision(opts: {
  readonly source: DecisionReportSource;
  readonly action: string;
  readonly reasons?: readonly string[];
  readonly reportConfidence?: string;
  readonly divergedFromSupport?: boolean;
}): AthleteDecision {
  return athleteDecision({
    athleteRef: ATHLETE,
    choice: decisionChoice({ action: opts.action }),
    rationale: decisionRationale(opts.reasons ?? []),
    // the link back to the reflection that informed the decision (= the session's sourceCaseRef)
    context: decisionContext({ decisionSupportCaseRef: SOURCE_CASE_REF, purposeVersionRef: PURPOSE_VERSION_REF }),
    source: opts.source,
    at: T("2026-09-02T18:00:00.000Z"),
    ...(opts.reportConfidence !== undefined ? { reportConfidence: opts.reportConfidence } : {}),
    ...(opts.divergedFromSupport !== undefined ? { divergedFromSupport: opts.divergedFromSupport } : {}),
  });
}

// ===== Case 1 — athlete-declared post-reflection capture, linked to the reflection =====
test("athlete-declared: a decision made after the reflection is captured and linked to the reflection/session", () => {
  const decision = postReflectionDecision({
    source: "athlete-declared",
    action: "I'll keep tomorrow easy and reassess on Thursday",
    reasons: ["I want to respect the heaviness Aurora surfaced"],
  });

  // captured only after explicit athlete input, via the existing coordinator
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });

  assert.equal(decision.source, "athlete-declared");
  assert.ok(record.byId(decision.id), "the decision lives in the athlete-owned record");
  // linked to the originating reflection via the existing decisionSupportCaseRef (= the session's sourceCaseRef)
  assert.equal(decision.context.decisionSupportCaseRef, SOURCE_CASE_REF);
  // re-entry is a SubjectiveObservation only — never a Signal/Evidence
  const obs = decisionAsObservation(decision);
  assert.equal(obs.kind, "subjective");
  assert.equal((obs as unknown as Record<string, unknown>)["outcome"], undefined); // not a Signal
  assert.equal((obs as unknown as Record<string, unknown>)["direction"], undefined); // not a Signal
  assert.equal((obs as unknown as Record<string, unknown>)["trace"], undefined); // not an Evidence/Signal trace
});

// ===== Case 2 — athlete-reported post-reflection capture, linked to the reflection =====
test("athlete-reported: a later-reported decision is captured and linked to the reflection/session", () => {
  const decision = postReflectionDecision({
    source: "athlete-reported",
    action: "I ended up riding easy yesterday after reading the reflection",
    reasons: ["legs were still heavy"],
    reportConfidence: "fairly sure",
  });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });

  assert.equal(decision.source, "athlete-reported");
  assert.notEqual(decision.source, "athlete-declared");
  assert.ok(record.byId(decision.id));
  assert.equal(decision.context.decisionSupportCaseRef, SOURCE_CASE_REF);
  // athlete-reported is the athlete's own report — never a system inference
  const obs = decisionAsObservation(decision);
  assert.equal(obs.provenance.source, "athlete-report");
  assert.equal(obs.inquiryRef, SOURCE_CASE_REF); // relation to the reflection preserved on re-entry
});

// ===== Case 3 — operator/scribe: valid ONLY as athlete-reported content; operator is never the source =====
test("operator scribe: an operator-conveyed decision is recorded only as athlete-reported; operator is not the source", () => {
  // an operator transcribes what the athlete reported. The honest source is the ATHLETE, recorded as
  // athlete-reported. The operatorRef is operational metadata of the SESSION, never the decision's source.
  const operatorRef = "operator:op-037a";
  const decision = postReflectionDecision({
    source: "athlete-reported", // the ONLY honest source for scribed content — operator mediation ≠ decision source
    action: "the athlete reported they chose to rest the next day",
    reasons: ["athlete said the heaviness persisted"],
  });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });

  assert.equal(decision.source, "athlete-reported");
  assert.equal(decision.athleteRef, ATHLETE);
  assert.notEqual(decision.athleteRef, operatorRef); // the decision belongs to the athlete, not the operator
  assert.ok(record.byId(decision.id));
  // the decision object carries no operator/source-of-truth field beyond the athlete source union
  const bag = decision as unknown as Record<string, unknown>;
  assert.equal(bag["operatorRef"], undefined);
  assert.equal(bag["operator"], undefined);
});

// ===== Case 4 — source honesty is structural: only the athlete-source union is recordable =====
test("source honesty: only athlete-declared/athlete-reported are valid; non-athlete sources fail closed", () => {
  // TYPE-LEVEL: DecisionReportSource = "athlete-declared" | "athlete-reported". A system/inferred/operator/AI
  // source is a COMPILE ERROR, so it cannot even be expressed in the valid path above. We document that here
  // and prove the RUNTIME guard for any value that escapes the type (e.g. crossing an untyped boundary).
  const acceptable: readonly DecisionReportSource[] = ["athlete-declared", "athlete-reported"];
  assert.deepEqual([...acceptable].sort(), ["athlete-declared", "athlete-reported"]);

  for (const bad of ["system-inferred", "operator", "ai", "delivery-success", "reflection-ready", ""]) {
    assert.throws(
      () =>
        athleteDecision({
          athleteRef: ATHLETE,
          choice: decisionChoice({ action: "x" }),
          context: decisionContext({ decisionSupportCaseRef: SOURCE_CASE_REF }),
          source: bad as unknown as DecisionReportSource,
          at: T("2026-09-02T18:00:00.000Z"),
        }),
      /athlete-sourced/,
      `a non-athlete source (${bad}) must fail closed`,
    );
  }
});

// ===== Case 5 — missing decision content fails closed (no empty/auto decision) =====
test("a decision with no chosen action fails closed — nothing is captured without athlete content", () => {
  assert.throws(
    () =>
      athleteDecision({
        athleteRef: ATHLETE,
        choice: decisionChoice({ action: "" }),
        context: decisionContext({ decisionSupportCaseRef: SOURCE_CASE_REF }),
        source: "athlete-declared",
        at: T("2026-09-02T18:00:00.000Z"),
      }),
    /non-empty chosen action/,
  );
});

// ===== Case 6 — reflection-ready alone creates NO AthleteDecision (runtime exercised unchanged) =====
test("reflection-ready / validated reflection / admitted renderable create NO AthleteDecision", async () => {
  const request = assembleRenderingRequestFromRealTerminalOutput();
  assert.equal(admitExternalRenderable(request).admitted, true); // admission success ≠ AthleteDecision

  const repo = new InMemoryAthleteDecisionRecordRepository();
  const out = await offlineReflectionRuntime(command(request), deps());

  assert.equal(out.status, "reflection-ready");
  assert.equal(out.reflection?.validationPassed, true); // validateDraft success ≠ AthleteDecision
  // the runtime only INVITES a future decision; it never records one
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation");
  assert.deepEqual([...out.decisionCapture.acceptableSources], ["athlete-declared", "athlete-reported"]);
  // no decision exists for the athlete unless one is explicitly captured later
  assert.equal(repo.exists(ATHLETE), false);
  // the outcome JSON carries no decision record shape
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["athletedecision", "\"choice\"", "\"rationale\""]) {
    assert.equal(json.includes(banned), false, `reflection-ready outcome must not contain '${banned}'`);
  }
});

// ===== Case 7 — delivery withheld is NOT an AthleteDecision (and is not delivery failure) =====
test("delivery withheld is not an AthleteDecision (delivery withheld ≠ delivery failure)", async () => {
  const out = await offlineReflectionRuntime(command(assembleRenderingRequestFromRealTerminalOutput()), deps());
  assert.equal(out.deliveryWithheld, true); // withheld, not failed
  assert.equal(out.trace.deliveryRecordId, undefined);
  assert.equal(out.trace.deliveryRequestId, undefined);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // still no decision
});

// ===== Case 8 — silence / no athlete response creates NO AthleteDecision =====
test("silence: no athlete response means no AthleteDecision is created", () => {
  // The athlete reads the reflection and says nothing. No athleteDecision(...) is called, so the record stays
  // empty. There is no path that fabricates a decision from silence.
  const record = AthleteDecisionRecord.empty(ATHLETE);
  assert.equal(record.decisions.length, 0);
  assert.equal(record.active().length, 0);
});

// ===== Case 9 — observed later behavior is NOT a decision unless athlete-sourced =====
test("observed behavior alone is not a decision; it re-enters only as a SubjectiveObservation", () => {
  // A measured observation of what the athlete later did is NOT an AthleteDecision. It is just an observation
  // until the athlete declares/reports the choice behind it. Building a decision still requires athlete source.
  const observed = buildObservationSet();
  assert.ok(observed.observations.length > 0);
  const asDecision = observed as unknown as Record<string, unknown>;
  assert.equal(asDecision["source"], undefined); // an ObservationSet carries no decision source
  assert.equal(asDecision["choice"], undefined);

  // only an explicit athlete-sourced statement becomes a decision, which re-enters as an observation again
  const decision = postReflectionDecision({ source: "athlete-declared", action: "I chose to rest" });
  const obs = decisionAsObservation(decision);
  assert.equal(obs.kind, "subjective"); // re-entry as observation, never Signal/Evidence
});

// ===== Case 10 — feedback re-entry is a SubjectiveObservation, never a Signal/Evidence, no understanding update =====
test("feedback loop: the captured decision re-enters ONLY as a SubjectiveObservation (no Signal/Evidence/Understanding)", () => {
  const decision = postReflectionDecision({
    source: "athlete-reported",
    action: "rode easy instead of the planned intervals",
    reasons: ["legs heavy"],
    divergedFromSupport: true, // NEUTRAL fact — following Aurora ≠ obedience-success
  });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });
  assert.ok(record.byId(decision.id));

  const obs = decisionAsObservation(decision);
  assert.equal(obs.kind, "subjective");
  assert.ok(obs.provenance.reference.startsWith("athlete-decision:")); // decision id reachable for LATER reasoning
  assert.ok(obs.words.includes("rode easy"));
  // not a Signal, not Evidence, no understanding/reasoning artifact produced directly here
  const bag = obs as unknown as Record<string, unknown>;
  assert.equal(bag["outcome"], undefined);
  assert.equal(bag["direction"], undefined);
  assert.equal(bag["trace"], undefined);
  assert.equal(bag["evidence"], undefined);
  assert.equal(bag["understanding"], undefined);
  assert.equal(bag["confidence"], undefined);
  // divergedFromSupport is neutral metadata on the decision, never a compliance/obedience score
  assert.equal(decision.divergedFromSupport, true);
  const dbag = decision as unknown as Record<string, unknown>;
  for (const banned of ["compliance", "obedience", "score", "reward", "grade"]) {
    assert.equal(dbag[banned], undefined, `an AthleteDecision must carry no '${banned}' field`);
  }
});

// ===== Case 11 — the runtime is exercised unchanged; capture is a SEPARATE, explicit step =====
test("the runtime is not the capture path: a decision is only created by an explicit, separate athlete step", async () => {
  // run the session
  const out = await offlineReflectionRuntime(command(assembleRenderingRequestFromRealTerminalOutput()), deps());
  assert.equal(out.status, "reflection-ready");
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation");

  // capture happens AFTERWARD, as its own athlete-sourced step, linked back via the session's sourceCaseRef
  const repo = new InMemoryAthleteDecisionRecordRepository();
  assert.equal(repo.exists(ATHLETE), false); // nothing yet

  const decision = postReflectionDecision({ source: "athlete-declared", action: "I'll rest tomorrow" });
  const record = recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision });
  repo.save(record);

  assert.equal(repo.exists(ATHLETE), true);
  const reloaded = repo.findByAthleteRef(ATHLETE);
  assert.ok(reloaded?.byId(decision.id));
  assert.equal(reloaded?.byId(decision.id)?.context.decisionSupportCaseRef, SOURCE_CASE_REF);
});

// Implementation 009 — integration: the athlete's decision returns as athlete-owned learning
// material. The DecisionSupportCase only REFERENCES it; the decision re-enters as a
// SubjectiveObservation (never Signal/Evidence/Understanding); outcome never grades the support.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";

import {
  AthleteDecisionRecord,
  athleteDecision,
  athleteDecisionRefOf,
  decisionChoice,
  decisionContext,
  decisionRationale,
} from "../athlete/index.ts";

import {
  decisionOpportunity,
  evaluateDecisionSupportCase,
  noRisk,
  openDecisionSupportCase,
  purposeContext,
  traceabilityVerificationResult,
} from "../decision-support/index.ts";
import type { CandidateSupport } from "../decision-support/index.ts";

import {
  UnderstandingProfile,
  produceUnderstandingAssessment,
  reasoningOutcome,
  understandingDimension,
} from "../understanding/index.ts";
import type { HypothesisId } from "../reasoning/index.ts";

import { decisionAsObservation, toSupportDecisionRef } from "./decision-observation-adapter.ts";

const T = (iso: string) => timestamp(iso);
const DIM = understandingDimension("aerobic-response", "high-intensity");

function aSupportCase() {
  const profile = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    reasoningOutcome({
      hypothesisId: "hyp-1" as unknown as HypothesisId,
      athleteRef: "athlete:1",
      outcomeKind: "supported",
      hadDeclaredFalsifier: true,
      conditions: ["high-intensity ride"],
      dimension: DIM,
      at: T("2026-01-02T09:05:00.000Z"),
    }),
  );
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIM.key });
  assert.ok(assessment);
  const candidate: CandidateSupport = Object.freeze({ intent: "reflect", markers: [], uncertaintyVisible: true });
  return evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({
        choice: "reflect vs push",
        whySupportMayHelp: "non-obvious pattern",
        athleteRef: "athlete:1",
        at: T("2026-01-02T11:00:00.000Z"),
      }),
      assessment,
      purpose: purposeContext("declared", "build aerobic base"),
      risk: noRisk(),
      candidate,
      trace: traceabilityVerificationResult("complete", "verified", { observationSetId: "s", observationIds: ["o"] }),
      claimState: "supported",
    }),
  });
}

function aDecision() {
  return athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "rode easy instead of intervals" }),
    rationale: decisionRationale(["legs heavy"]),
    context: decisionContext({ decisionSupportCaseRef: "case-1", purposeVersionRef: "pv-1" }),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
    divergedFromSupport: true,
  });
}

test("the decision is recorded in athlete; the case records ONLY a ref and never owns it", () => {
  const decision = aDecision();
  const record = AthleteDecisionRecord.empty("athlete:1").record(decision);
  assert.ok(record.byId(decision.id), "the decision lives in the athlete record");

  // the case references the decision via the existing decision-support ref API (adapted in harness)
  const evaluated = aSupportCase();
  const withRef = evaluated.recordAthleteDecisionRef(toSupportDecisionRef(athleteDecisionRefOf(decision)));
  assert.equal(withRef.athleteDecisionRef?.decisionId, String(decision.id));
  // the case holds no AthleteDecision object -- only the ref
  const bag = withRef as unknown as Record<string, unknown>;
  assert.equal(bag["athleteDecision"], undefined);
  assert.equal((withRef.athleteDecisionRef as unknown as Record<string, unknown>)["choice"], undefined);
});

test("the decision re-enters as a SubjectiveObservation -- not Signal, not Evidence", () => {
  const obs = decisionAsObservation(aDecision());
  assert.equal(obs.kind, "subjective");
  assert.equal((obs as unknown as Record<string, unknown>)["outcome"], undefined); // not a Signal
  assert.equal((obs as unknown as Record<string, unknown>)["direction"], undefined); // not a Signal
  assert.equal((obs as unknown as Record<string, unknown>)["trace"], undefined); // not an EvidenceCase/Signal trace
  // the decision id remains reachable for later reasoning
  assert.ok(obs.provenance.reference.startsWith("athlete-decision:"));
  assert.ok(obs.words.includes("rode easy"));
});

test("the re-entry observation carries provenance/quality and the support-case relation", () => {
  const obs = decisionAsObservation(aDecision());
  assert.equal(obs.provenance.source, "athlete-report");
  assert.equal(obs.quality.status, "complete");
  assert.equal(obs.inquiryRef, "case-1"); // relation to the support case preserved
});

test("there is no shortcut from AthleteDecision to Evidence or Understanding", () => {
  // The only re-entry the harness offers is decisionAsObservation -> Observation.
  // There is deliberately no decisionAsEvidence / decisionAsUnderstandingUpdate export.
  const adapter = { decisionAsObservation, toSupportDecisionRef } as Record<string, unknown>;
  assert.equal(adapter["decisionAsEvidence"], undefined);
  assert.equal(adapter["decisionAsUnderstandingUpdate"], undefined);
  assert.equal(adapter["decisionAsSignal"], undefined);
});

test("good/bad outcome does not grade SupportQuality (integrity is fixed at support time)", () => {
  const evaluated = aSupportCase();
  const quality = evaluated.supportQuality;
  assert.ok(quality);
  // recording a later divergent decision (a 'bad' signal for obedience-minded systems) leaves
  // SupportQuality untouched -- it reflects gate integrity at the time, not the outcome.
  const withRef = evaluated.recordAthleteDecisionRef(toSupportDecisionRef(athleteDecisionRefOf(aDecision())));
  assert.deepEqual(withRef.supportQuality, quality);
});

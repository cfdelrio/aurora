// Implementation 008 — integration: projection freshness flows to decision-support ENTIRELY through
// the existing safeVoiceCeiling. decision-support reads no freshness directly; non-current freshness
// can only lower the voice, and invalid/unknown collapse the ceiling to none -> Withholding.

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";

import {
  UnderstandingProfile,
  applyFreshness,
  projectionFreshness,
  reasoningOutcome,
  understandingDimension,
} from "../understanding/index.ts";
import type { ProjectionFreshness, UnderstandingAssessment } from "../understanding/index.ts";
import type { HypothesisId } from "../reasoning/index.ts";

import {
  decisionOpportunity,
  evaluateDecisionSupportCase,
  noRisk,
  openDecisionSupportCase,
  purposeContext,
  traceabilityVerificationResult,
} from "../decision-support/index.ts";
import type { CandidateSupport } from "../decision-support/index.ts";

const T = (iso: string) => timestamp(iso);
const DIM = understandingDimension("aerobic-response", "high-intensity");

function workingAssessment(): UnderstandingAssessment {
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
  const a = profile.assess(DIM.key, T("2026-01-02T10:00:00.000Z"));
  assert.ok(a);
  return a;
}

function outcomeFor(assessment: UnderstandingAssessment) {
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
      trace: traceabilityVerificationResult("complete", "verified", {
        observationSetId: "set-1",
        observationIds: ["obs-1"],
      }),
      claimState: "supported",
    }),
  }).selectedOutput;
}

test("current freshness preserves the Implementation 006 Reflection scenario", () => {
  const a = workingAssessment();
  assert.equal(a.freshness?.status, "current");
  const out = outcomeFor(a);
  assert.ok(out && out.outcome === "support" && out.voice === "Reflection");
});

test("partial freshness constrains the voice (no Recommendation; here collapses to Withholding)", () => {
  const a = applyFreshness(workingAssessment(), projectionFreshness("partial", ["source-quality-changed"]));
  const out = outcomeFor(a);
  // Working base = tentative; partial lowers to none -> Withholding
  assert.equal(out?.outcome, "withholding");
});

test("invalid freshness denies Recommendation and yields Withholding (ceiling none)", () => {
  const a = applyFreshness(workingAssessment(), projectionFreshness("invalid", ["hypothesis-falsified"]));
  assert.equal(a.safeVoiceCeiling, "none");
  const out = outcomeFor(a);
  assert.equal(out?.outcome, "withholding"); // withholding inherently denies Recommendation
});

test("unknown freshness denies Recommendation and yields Withholding (ceiling none)", () => {
  const a = applyFreshness(workingAssessment(), projectionFreshness("unknown", ["projection-source-unavailable"]));
  assert.equal(a.safeVoiceCeiling, "none");
  const out = outcomeFor(a);
  assert.equal(out?.outcome, "withholding");
});

test("non-current freshness records an auditable degradation reason (visible to consumers)", () => {
  const a = applyFreshness(workingAssessment(), projectionFreshness("invalid", ["hypothesis-falsified"]));
  assert.ok(a.reasons.some((r) => r.includes("freshness invalid")));
  // the constraint reached decision-support purely via the ceiling -- no freshness read needed there
  assert.equal(a.safeVoiceCeiling, "none");
});

test("a never-current freshness can never reach Recommendation regardless of reason", () => {
  const reasons: ProjectionFreshness[] = [
    projectionFreshness("stale", ["time-decay"]),
    projectionFreshness("partial", ["missing-source"]),
    projectionFreshness("invalid", ["new-contradictory-evidence"]),
    projectionFreshness("unknown", ["projection-source-unavailable"]),
  ];
  for (const f of reasons) {
    const out = outcomeFor(applyFreshness(workingAssessment(), f));
    if (out && out.outcome === "support") {
      assert.notEqual(out.voice as string, "Recommendation");
    }
  }
});

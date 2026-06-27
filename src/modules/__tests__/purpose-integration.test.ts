// Implementation 007 — integration: declared, versioned Purpose flows into decision-support and
// understanding through explicit seams, without athlete reaching downstream and without rewriting
// the past. Cross-module wiring proven via the neutral harness adapters (purpose-adapters.ts).

import { test } from "node:test";
import assert from "node:assert/strict";

import { timestamp } from "../../shared-kernel/time.ts";

import { Athlete, ambiguousPurpose, purpose, purposeVersionRefOf } from "../athlete/index.ts";

import {
  decisionOpportunity,
  evaluateDecisionSupportCase,
  noRisk,
  openDecisionSupportCase,
  traceabilityVerificationResult,
} from "../decision-support/index.ts";
import type { CandidateSupport, PurposeContext } from "../decision-support/index.ts";

import {
  UnderstandingProfile,
  produceUnderstandingAssessment,
  reasoningOutcome,
  understandingDimension,
  updateUnderstandingFromOutcome,
} from "../understanding/index.ts";
import type { UnderstandingAssessment } from "../understanding/index.ts";

import { Hypothesis, falsifier, hypothesisClaim, hypothesisScope, openHypothesis } from "../reasoning/index.ts";
import type { HypothesisId } from "../reasoning/index.ts";

import { applyPurposeChangeToUnderstanding, toPurposeContext } from "./purpose-adapters.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:p7";
const DIM = understandingDimension("aerobic-response", "high-intensity");
const DIM2 = understandingDimension("heat-response", "long-efforts");

// A real, modest assessment (level Working -> ceiling tentative), built cheaply via a fabricated
// outcome (no full observation->signal chain needed to exercise the purpose seams).
function workingProfile(dimension = DIM): UnderstandingProfile {
  return updateUnderstandingFromOutcome({
    profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }),
    outcome: reasoningOutcome({
      hypothesisId: "hyp-1" as unknown as HypothesisId,
      athleteRef: ATHLETE,
      outcomeKind: "supported",
      hadDeclaredFalsifier: true,
      conditions: ["high-intensity ride"],
      dimension,
      at: T("2026-01-02T09:05:00.000Z"),
    }),
  });
}

function assessmentFrom(profile: UnderstandingProfile, dimensionKey = DIM.key): UnderstandingAssessment {
  const a = produceUnderstandingAssessment({ profile, dimensionKey });
  assert.ok(a);
  return a;
}

function evaluateWith(purposeCtx: PurposeContext, assessment: UnderstandingAssessment) {
  const candidate: CandidateSupport = Object.freeze({ intent: "reflect", markers: [], uncertaintyVisible: true });
  return evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({
        choice: "reflect vs push",
        whySupportMayHelp: "non-obvious pattern",
        athleteRef: ATHLETE,
        at: T("2026-01-02T09:10:00.000Z"),
      }),
      assessment,
      purpose: purposeCtx,
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

test("missing purpose maps to decision-support 'unknown' context and forces Inquiry", () => {
  const a = Athlete.create({ identityRef: ATHLETE }); // no purpose declared
  const ctx = toPurposeContext(a.currentPurposeView());
  assert.equal(ctx.status, "unknown");
  const out = evaluateWith(ctx, assessmentFrom(workingProfile()));
  assert.equal(out?.outcome, "inquiry");
});

test("ambiguous purpose maps to 'ambiguous' context and forces Inquiry", () => {
  const a = Athlete.create({ identityRef: ATHLETE }).declarePurpose(
    ambiguousPurpose({
      source: "athlete-accepted",
      effectiveAt: T("2026-01-01T00:00:00.000Z"),
      ambiguityNote: "unsure this season",
    }),
  );
  const ctx = toPurposeContext(a.currentPurposeView());
  assert.equal(ctx.status, "ambiguous");
  const out = evaluateWith(ctx, assessmentFrom(workingProfile()));
  assert.equal(out?.outcome, "inquiry");
});

test("current declared purpose maps to 'declared' context and permits support (Reflection)", () => {
  const a = Athlete.create({ identityRef: ATHLETE }).declarePurpose(
    purpose({ statement: "build aerobic base", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }),
  );
  const ctx = toPurposeContext(a.currentPurposeView());
  assert.equal(ctx.status, "declared");
  assert.equal(ctx.purpose, "build aerobic base");
  const out = evaluateWith(ctx, assessmentFrom(workingProfile()));
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Reflection");
  }
});

test("a PurposeVersionRef can be passed into Hypothesis.purposeContextRef (no reasoning refactor)", () => {
  const a = Athlete.create({ identityRef: ATHLETE }).declarePurpose(
    purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }),
  );
  const v = a.currentVersion();
  assert.ok(v);
  const ref = purposeVersionRefOf(v);

  const h: Hypothesis = openHypothesis({
    claim: hypothesisClaim("threshold work raises aerobic response", "response-pattern"),
    scope: hypothesisScope({ statement: "threshold rides" }),
    athleteRef: ATHLETE,
    purposeContextRef: ref, // PurposeVersionRef flows in as the existing string slot
    falsifiers: [falsifier({ condition: "flat retest", status: "declared" })],
  });
  assert.equal(h.purposeContextRef, ref);
});

test("PurposeChanged drives SELECTIVE understanding staleness (reason purpose-change)", () => {
  const a = Athlete.create({ identityRef: ATHLETE })
    .declarePurpose(purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }))
    .changePurpose(
      purpose({ statement: "recover from injury", source: "athlete-declared", effectiveAt: T("2026-03-01T00:00:00.000Z") }),
      "injury",
    );
  const change = a.lastPurposeChange();
  assert.ok(change);

  const before = workingProfile();
  const beforeAssessment = assessmentFrom(before);
  assert.equal(beforeAssessment.staleness.status, "fresh");
  assert.equal(beforeAssessment.safeVoiceCeiling, "tentative");

  const after = applyPurposeChangeToUnderstanding({ profile: before, dimensionKey: DIM.key, change });
  const afterAssessment = assessmentFrom(after);
  assert.equal(afterAssessment.staleness.status, "stale");
  assert.ok(afterAssessment.reasons.some((r) => r.includes("purpose-change")));
  // stale can only LOWER the ceiling (tentative -> none)
  assert.notEqual(afterAssessment.safeVoiceCeiling, "tentative");
});

test("PurposeChanged does not directly mutate UnderstandingProfile (returns a new one)", () => {
  const a = Athlete.create({ identityRef: ATHLETE })
    .declarePurpose(purpose({ statement: "a", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }))
    .changePurpose(purpose({ statement: "b", source: "athlete-declared", effectiveAt: T("2026-02-01T00:00:00.000Z") }));
  const change = a.lastPurposeChange();
  assert.ok(change);

  const before = workingProfile();
  const after = applyPurposeChangeToUnderstanding({ profile: before, dimensionKey: DIM.key, change });
  assert.notEqual(before, after); // immutable-by-operation
  // the original profile's dimension is untouched (still fresh)
  assert.equal(assessmentFrom(before).staleness.status, "fresh");
});

test("a purpose change does not globally reset understanding (only the named dimension goes stale)", () => {
  const a = Athlete.create({ identityRef: ATHLETE })
    .declarePurpose(purpose({ statement: "a", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }))
    .changePurpose(purpose({ statement: "b", source: "athlete-declared", effectiveAt: T("2026-02-01T00:00:00.000Z") }));
  const change = a.lastPurposeChange();
  assert.ok(change);

  // a profile with TWO dimensions
  let profile = workingProfile(DIM);
  profile = updateUnderstandingFromOutcome({
    profile,
    outcome: reasoningOutcome({
      hypothesisId: "hyp-2" as unknown as HypothesisId,
      athleteRef: ATHLETE,
      outcomeKind: "supported",
      hadDeclaredFalsifier: true,
      conditions: ["long effort in heat"],
      dimension: DIM2,
      at: T("2026-01-03T09:05:00.000Z"),
    }),
  });

  const after = applyPurposeChangeToUnderstanding({ profile, dimensionKey: DIM.key, change });
  assert.equal(assessmentFrom(after, DIM.key).staleness.status, "stale");
  assert.equal(assessmentFrom(after, DIM2.key).staleness.status, "fresh"); // untouched
});

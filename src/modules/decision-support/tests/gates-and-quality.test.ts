// Spec 005 — gates in isolation, agency, SupportQuality, AthleteDecisionRef.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DecisionSupportCase,
  agencyGate,
  athleteDecisionRef,
  riskGate,
  understandingGate,
} from "../index.ts";
import type { OpenCaseInput } from "../index.ts";
import {
  assessmentAt,
  candidate,
  declaredPurpose,
  highRisk,
  lowRisk,
  opportunity,
  T,
  trace,
} from "./helpers.ts";

function baseInput(overrides: Partial<OpenCaseInput> = {}): OpenCaseInput {
  return {
    opportunity: opportunity(),
    assessment: assessmentAt("confident"),
    purpose: declaredPurpose(),
    risk: lowRisk(),
    candidate: candidate("recommend"),
    trace: trace("complete"),
    claimState: "supported",
    ...overrides,
  };
}

test("UnderstandingGate fails when requested voice exceeds the ceiling (qualified !-> Recommendation)", () => {
  const g = understandingGate(assessmentAt("qualified"), "Recommendation");
  assert.equal(g.verdict, "fail");
});

test("RiskGate escalates only to caution-warning, never to a recommendation verdict", () => {
  const g = highRisk();
  const r = riskGate(g);
  assert.equal(r.verdict, "caution-warning");
  // there is no verdict that escalates toward Recommendation
  assert.notEqual(r.verdict as string, "recommend");
});

test("AgencyGate rejects command intent", () => {
  const g = agencyGate(candidate("recommend", ["command"]));
  assert.equal(g.verdict, "fail");
});

test("AgencyGate rejects shame intent", () => {
  const g = agencyGate(candidate("reflect", ["shame"]));
  assert.equal(g.verdict, "fail");
});

test("a command-intent candidate makes the case withhold (agency could not be preserved)", () => {
  const out = DecisionSupportCase.open(baseInput({ candidate: candidate("recommend", ["command"]) }))
    .evaluate()
    .selectedOutput;
  assert.equal(out?.outcome, "withholding");
});

test("hidden-uncertainty intent is rejected by AgencyGate", () => {
  assert.equal(agencyGate(candidate("frame", ["hidden-uncertainty"])).verdict, "fail");
});

test("SupportQuality reflects gate integrity, not outcome; AthleteDecisionRef is referenced, not owned", () => {
  const evaluated = DecisionSupportCase.open(baseInput()).evaluate();
  assert.ok(evaluated.supportQuality);
  assert.ok(evaluated.supportQuality.gatesPassed.length > 0);
  assert.equal(evaluated.supportQuality.traceability, "complete");

  // record the athlete's later decision -- a reference, recorded after the fact
  const withRef = evaluated.recordAthleteDecisionRef(
    athleteDecisionRef("decision-1", T("2026-01-03T09:00:00.000Z"), true),
  );
  assert.equal(withRef.athleteDecisionRef?.decisionId, "decision-1");
  // SupportQuality is unchanged by the athlete's decision/outcome
  assert.deepEqual(withRef.supportQuality, evaluated.supportQuality);
  // the case does not own an AthleteDecision -- only a reference field exists
  const bag = withRef as unknown as Record<string, unknown>;
  assert.equal(bag["athleteDecision"], undefined);
});

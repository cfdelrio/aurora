// Implementation 010 — DecisionSupportCase round-trip: terminal output + support integrity survive,
// and the case round-trips referencing the athlete decision WITHOUT owning a decision object.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DecisionSupportCase,
  InMemoryDecisionSupportCaseRepository,
  athleteDecisionRef,
} from "../index.ts";
import type { DecisionSupportCaseState, OpenCaseInput } from "../index.ts";
import {
  T,
  assessmentAt,
  candidate,
  declaredPurpose,
  lowRisk,
  opportunity,
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

test("DecisionSupportCase round-trips: terminal output, voice, support integrity survive", () => {
  const repo = new InMemoryDecisionSupportCaseRepository();
  const evaluated = DecisionSupportCase.open(baseInput()).evaluate();
  repo.save(evaluated);

  const loaded = repo.findById(evaluated.id);
  assert.ok(loaded);
  const out = loaded.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Recommendation");
  }
  assert.ok(loaded.supportQuality);
  assert.deepEqual(loaded.supportQuality, evaluated.supportQuality);
  assert.equal(loaded.gateResults.length, evaluated.gateResults.length);
});

test("the case round-trips referencing AthleteDecisionRef without owning a decision object", () => {
  const repo = new InMemoryDecisionSupportCaseRepository();
  const withRef = DecisionSupportCase.open(baseInput())
    .evaluate()
    .recordAthleteDecisionRef(athleteDecisionRef("decision-1", T("2026-01-03T09:00:00.000Z"), true));
  repo.save(withRef);

  const loaded = repo.findById(withRef.id);
  assert.ok(loaded);
  assert.equal(loaded.athleteDecisionRef?.decisionId, "decision-1");
  assert.equal(loaded.athleteDecisionRef?.divergedFromSupport, true);
  // only a ref -- no decision object, no choice/rationale on the case
  const refBag = loaded.athleteDecisionRef as unknown as Record<string, unknown>;
  assert.equal(refBag["choice"], undefined);
  assert.equal(refBag["rationale"], undefined);
  const caseBag = loaded as unknown as Record<string, unknown>;
  assert.equal(caseBag["athleteDecision"], undefined);
});

test("mutation isolation + reconstitute rejects invalid state", () => {
  const repo = new InMemoryDecisionSupportCaseRepository();
  const evaluated = DecisionSupportCase.open(baseInput()).evaluate();
  repo.save(evaluated);
  const a = repo.findById(evaluated.id);
  const b = repo.findById(evaluated.id);
  assert.ok(a && b);
  assert.notEqual(a, b);

  const bad = { ...evaluated.toState(), claimState: undefined } as unknown as DecisionSupportCaseState;
  assert.throws(() => DecisionSupportCase.reconstitute(bad));
});

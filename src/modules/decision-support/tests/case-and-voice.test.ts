// Spec 005 UC1-UC8 — opening, voice selection, degradation, Inquiry, Withholding.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DecisionSupportCase,
  purposeContext,
} from "../index.ts";
import type { OpenCaseInput } from "../index.ts";
import {
  assessmentAt,
  candidate,
  declaredPurpose,
  highRisk,
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

test("UC1 — opening a case produces no terminal output before gates run", () => {
  const c = DecisionSupportCase.open(baseInput());
  assert.equal(c.selectedOutput, undefined);
  assert.equal(c.gateResults.length, 0);
});

test("UC5 — all gates permit + confident ceiling + complete trace -> Recommendation", () => {
  const out = DecisionSupportCase.open(baseInput()).evaluate().selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Recommendation");
    assert.equal(out.preservesAgency, true);
  }
});

test("qualified ceiling permits Framing, NOT Recommendation", () => {
  const out = DecisionSupportCase.open(baseInput({ assessment: assessmentAt("qualified") }))
    .evaluate()
    .selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Framing");
  }
});

test("tentative ceiling tops out at Reflection", () => {
  const out = DecisionSupportCase.open(baseInput({ assessment: assessmentAt("tentative") }))
    .evaluate()
    .selectedOutput;
  assert.equal(out?.outcome === "support" && out.voice, "Reflection");
});

test("UC8 — incomplete traceability degrades Recommendation and records a reason", () => {
  const c = DecisionSupportCase.open(baseInput({ trace: trace("partial") })).evaluate();
  const out = c.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.notEqual(out.voice, "Recommendation"); // degraded
  }
  assert.ok(c.degradations.some((d) => d.gate === "TraceabilityVerification"));
});

test("UC4 — high risk forces a cautionary Warning (even at confident ceiling), never Recommendation", () => {
  const c = DecisionSupportCase.open(baseInput({ risk: highRisk() })).evaluate();
  const out = c.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Warning");
    assert.notEqual(out.voice as string, "Recommendation");
  }
});

test("UC6 — missing purpose forces Inquiry (not a VoiceMode)", () => {
  const out = DecisionSupportCase.open(baseInput({ purpose: purposeContext("unknown") }))
    .evaluate()
    .selectedOutput;
  assert.equal(out?.outcome, "inquiry");
  assert.equal((out as unknown as Record<string, unknown>)["voice"], undefined);
});

test("UC6 — an unsettled claim forces Inquiry", () => {
  const out = DecisionSupportCase.open(baseInput({ claimState: "proposed" })).evaluate().selectedOutput;
  assert.equal(out?.outcome, "inquiry");
});

test("UC7 — a falsified claim withholds with an auditable reason", () => {
  const out = DecisionSupportCase.open(baseInput({ claimState: "falsified" })).evaluate().selectedOutput;
  assert.equal(out?.outcome, "withholding");
  assert.ok(out?.outcome === "withholding" && out.reason.length > 0);
});

test("missing traceability withholds (cannot assert responsibly)", () => {
  const out = DecisionSupportCase.open(baseInput({ trace: trace("missing") })).evaluate().selectedOutput;
  assert.equal(out?.outcome, "withholding");
});

test("ceiling none withholds (nothing responsible to assert)", () => {
  const out = DecisionSupportCase.open(baseInput({ assessment: assessmentAt("none") })).evaluate().selectedOutput;
  assert.equal(out?.outcome, "withholding");
});

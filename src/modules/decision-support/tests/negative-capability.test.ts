// THE DEFINING TESTS — voice is gated not derived; the case never owns the decision; no command.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as decisionSupportModule from "../index.ts";
import { DecisionSupportCase, purposeContext, selectTerminalOutput } from "../index.ts";
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

test("the VoiceSelectionPolicy input has no claim-confidence field (confidence cannot raise voice)", () => {
  // VoiceSelectionInputs is: assessment, purpose, risk, candidate, trace, claimState -- no confidence.
  const result = selectTerminalOutput({
    assessment: assessmentAt("qualified"),
    purpose: declaredPurpose(),
    risk: lowRisk(),
    candidate: candidate("frame"),
    trace: trace("complete"),
    claimState: "supported",
  });
  // qualified ceiling -> Framing max, regardless of any (absent) confidence
  assert.ok(result.output.outcome === "support" && result.output.voice === "Framing");
});

test("qualified ceiling NEVER yields Recommendation, even with complete trace and low risk", () => {
  const out = DecisionSupportCase.open(baseInput({ assessment: assessmentAt("qualified") }))
    .evaluate()
    .selectedOutput;
  assert.ok(out && out.outcome === "support");
  assert.notEqual(out.outcome === "support" && out.voice, "Recommendation");
});

test("no Recommendation without complete traceability", () => {
  for (const status of ["partial", "missing", "invalid"] as const) {
    const out = DecisionSupportCase.open(baseInput({ trace: trace(status) })).evaluate().selectedOutput;
    if (out?.outcome === "support") {
      assert.notEqual(out.voice, "Recommendation");
    } // missing/invalid -> withholding, which is also fine
  }
});

test("risk cannot escalate toward Recommendation (high risk + confident -> Warning)", () => {
  const out = DecisionSupportCase.open(baseInput({ risk: highRisk() })).evaluate().selectedOutput;
  assert.ok(out && out.outcome === "support" && out.voice === "Warning");
});

test("the module surface exposes no UI/LLM/notification/training-plan symbol", () => {
  const forbidden = /\bui\b|llm|notification|trainingplan|render|prompt/i;
  for (const name of Object.keys(decisionSupportModule)) {
    assert.equal(forbidden.test(name), false, `must not export '${name}'`);
  }
});

test("Inquiry is structurally not a VoiceMode (no voice field)", () => {
  const out = DecisionSupportCase.open(baseInput({ purpose: purposeContext("unknown") }))
    .evaluate()
    .selectedOutput;
  assert.equal(out?.outcome, "inquiry");
  assert.equal((out as unknown as Record<string, unknown>)["voice"], undefined);
});

test("Withholding is a valid auditable outcome, not a failure", () => {
  const out = DecisionSupportCase.open(baseInput({ claimState: "falsified" })).evaluate().selectedOutput;
  assert.equal(out?.outcome, "withholding");
});

test("degradation reasons are not lost when voice is degraded", () => {
  const c = DecisionSupportCase.open(baseInput({ trace: trace("partial") })).evaluate();
  assert.ok(c.degradations.length > 0);
});

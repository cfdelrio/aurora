// Implementation 014 — neutral integration: a REAL decision-support TerminalOutput becomes a
// RenderableDomainOutput and renders downstream — voice/kind preserved, nothing mutated. This composes
// decision-support + rendering OUTSIDE both modules (rendering never imports decision-support values).

import { test } from "node:test";
import assert from "node:assert/strict";

import { decisionSupport, inquiry, withholding, traceabilityVerificationResult } from "../decision-support/index.ts";
import { renderableFromTerminalOutput, render } from "../rendering/index.ts";

test("a real DecisionSupport (Reflection) renders, preserving voice and kind", () => {
  const output = decisionSupport({
    voice: "Reflection",
    intent: "reflect",
    uncertaintyVisible: true,
    trace: traceabilityVerificationResult("complete", "resolved", { observationSetId: "obs:1", observationIds: ["o1"] }),
    reasons: ["energy felt low in today's session"],
  });
  const renderable = renderableFromTerminalOutput({ sourceCaseRef: "case:e2e", output });
  const outcome = render({ renderable });
  assert.equal(outcome.status, "rendered");
  if (outcome.status !== "rendered") return;
  assert.equal(outcome.message.kind, "support");
  assert.equal(outcome.message.voice, "Reflection");
  assert.equal(outcome.message.sourceRef, "case:e2e");
});

test("a real Inquiry renders as an inquiry", () => {
  const output = inquiry("was the session harder than planned", "how the legs felt afterward", ["ambiguous report"]);
  const outcome = render({ renderable: renderableFromTerminalOutput({ sourceCaseRef: "case:i", output }) });
  assert.equal(outcome.status, "rendered");
  if (outcome.status !== "rendered") return;
  assert.equal(outcome.message.kind, "inquiry");
  assert.ok(outcome.message.text.includes("?"));
});

test("a real Withholding renders as withholding, preserving the reason", () => {
  const output = withholding("insufficient traceable evidence");
  const outcome = render({ renderable: renderableFromTerminalOutput({ sourceCaseRef: "case:w", output }) });
  assert.equal(outcome.status, "rendered");
  if (outcome.status !== "rendered") return;
  assert.equal(outcome.message.kind, "withholding");
  assert.ok(outcome.message.text.includes("insufficient traceable evidence"));
});

test("the terminal output is unchanged by rendering (no domain mutation)", () => {
  const output = withholding("insufficient traceable evidence");
  const before = JSON.stringify(output);
  render({ renderable: renderableFromTerminalOutput({ sourceCaseRef: "case:w", output }) });
  assert.equal(JSON.stringify(output), before);
});

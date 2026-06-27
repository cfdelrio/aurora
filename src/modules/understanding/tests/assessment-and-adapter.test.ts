// Spec 004 UC9 + adapter — read-only assessment; adapter drops confidence/evidence.

import { test } from "node:test";
import assert from "node:assert/strict";

import { UnderstandingProfile, reasoningOutcomeFrom } from "../index.ts";
import { dim, outcome, T } from "./helpers.ts";
import { Hypothesis, falsifier, hypothesisClaim, hypothesisScope } from "../../reasoning/index.ts";

test("produces a read-only UnderstandingAssessment with level/fragility/staleness/ceiling/reasons/trace", () => {
  const d = dim();
  const p = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    outcome({ kind: "supported", dimension: d, conditions: ["c1"] }),
  );
  const a = p.assess(d.key);
  assert.ok(a);
  assert.equal(a.dimension.key, d.key);
  assert.equal(a.level, "Working");
  assert.equal(a.safeVoiceCeiling, "tentative");
  assert.ok(Array.isArray(a.reasons));
  assert.ok(Array.isArray(a.trace));
  // it carries no advice / no voice selection
  const bag = a as unknown as Record<string, unknown>;
  for (const forbidden of ["recommendation", "voiceMode", "warning", "inquiry", "advice"]) {
    assert.equal(bag[forbidden], undefined, `assessment must not carry '${forbidden}'`);
  }
});

test("the adapter builds a ReasoningOutcome from a Hypothesis snapshot, carrying NO claim confidence", () => {
  const h = Hypothesis.open({
    claim: hypothesisClaim("block raised aerobic capacity", "impact"),
    scope: hypothesisScope({ statement: "6-week block" }),
    athleteRef: "athlete:1",
    falsifiers: [falsifier({ condition: "flat retest", status: "declared" })],
  });
  // move to a settled outcome state via the reasoning API (a transition that exists from proposed)
  const retired = h.retire("question no longer current", T("2026-02-01T00:00:00.000Z"));

  const out = reasoningOutcomeFrom({
    hypothesis: retired,
    dimension: dim(),
    conditions: ["heat"],
    at: T("2026-02-01T00:00:00.000Z"),
  });

  assert.equal(out.outcomeKind, "retired");
  assert.equal(out.athleteRef, "athlete:1");
  assert.equal(out.hadDeclaredFalsifier, true);
  // the outcome carries NO claim confidence -- confidence cannot map to understanding level
  const bag = out as unknown as Record<string, unknown>;
  assert.equal(bag["confidence"], undefined);
  assert.equal(bag["claimConfidence"], undefined);
});

test("the adapter refuses a population (non-athlete-specific) hypothesis", () => {
  const h = Hypothesis.open({
    claim: hypothesisClaim("athletes usually adapt", "impact"),
    scope: hypothesisScope({ statement: "population prior" }),
    // no athleteRef -> not athlete-specific
    falsifiers: [falsifier({ condition: "x", status: "declared" })],
  });
  const retired = h.retire("n/a", T("2026-02-01T00:00:00.000Z"));
  assert.throws(() =>
    reasoningOutcomeFrom({ hypothesis: retired, dimension: dim(), conditions: ["x"], at: T("2026-02-01T00:00:00.000Z") }),
  );
});

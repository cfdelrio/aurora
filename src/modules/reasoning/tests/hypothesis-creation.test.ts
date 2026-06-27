// Spec 003 UC1 — create a falsifiable Hypothesis; reject the unfalsifiable.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis, falsifier } from "../index.ts";
import { aClaim, aScope, declaredFalsifiers } from "./helpers.ts";

test("creates a falsifiable Hypothesis with explicit claim, scope, falsifier, and limited confidence", () => {
  const h = Hypothesis.open({
    claim: aClaim(),
    scope: aScope(),
    athleteRef: "athlete:1",
    falsifiers: declaredFalsifiers(),
  });

  assert.equal(h.state, "proposed");
  assert.equal(h.claim.statement, "this block raised aerobic capacity");
  assert.equal(h.falsifiers.length, 1);
  assert.equal(h.confidence.level, "tentative");
  assert.notEqual(h.confidence.level, "well-supported");
  assert.equal(h.evidence.length, 0);
});

test("a pending falsifier is allowed only with an explicit reason", () => {
  assert.throws(() => falsifier({ condition: "retest", status: "pending" }));
  const ok = falsifier({ condition: "retest", status: "pending", pendingReason: "retest not yet scheduled" });
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: [ok] });
  assert.equal(h.falsifiers[0]?.status, "pending");
});

test("a Hypothesis is never presented as fact (no such field) and confidence is never certain", () => {
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() });
  const bag = h as unknown as Record<string, unknown>;
  for (const forbidden of ["fact", "isFact", "certain", "truth", "proven"]) {
    assert.equal(bag[forbidden], undefined, `must not have '${forbidden}'`);
  }
  // the confidence level union has no "certain"
  assert.ok(["tentative", "limited", "moderate", "well-supported"].includes(h.confidence.level));
});

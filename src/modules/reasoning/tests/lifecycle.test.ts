// Spec 003 UC5/UC6 — retire and promote; preserved, traceable, never certain.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis } from "../index.ts";
import { T, aClaim, aScope, declaredFalsifiers, measuredSignal } from "./helpers.ts";

function supported() {
  return Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() }).attachEvidence({
    signal: measuredSignal(),
    direction: "supports",
    reasoningNote: "supports",
    at: T("2026-01-02T09:00:00.000Z"),
  });
}

test("retire records a reason, preserves history, and is not active support", () => {
  const retired = supported().retire("question no longer current", T("2026-02-01T00:00:00.000Z"));
  assert.equal(retired.state, "retired");
  assert.equal(retired.isActiveSupport(), false);
  assert.equal(retired.evidence.length, 1); // history preserved
  assert.ok(retired.revisions.some((r) => r.to === "retired" && r.cause.length > 0));
});

test("a retired hypothesis cannot transition further", () => {
  const retired = supported().retire("done", T("2026-02-01T00:00:00.000Z"));
  assert.throws(() => retired.promote("nope", T("2026-02-02T00:00:00.000Z")));
});

test("promotion to working knowledge is reversible and NOT certainty", () => {
  const promoted = supported().promote("survived varied challenge", T("2026-02-01T00:00:00.000Z"));
  assert.equal(promoted.state, "promoted-to-working-knowledge");
  assert.equal(promoted.isActiveSupport(), true);
  assert.equal(promoted.confidence.level, "well-supported");
  assert.notEqual(promoted.confidence.level as string, "certain");
  assert.ok(promoted.confidence.limitations.some((l) => l.includes("reversible")));

  // reversible: a later contradiction demotes it (recorded)
  const demoted = promoted.attachEvidence({
    signal: measuredSignal(),
    direction: "contradicts",
    reasoningNote: "new contradicting evidence",
    at: T("2026-02-05T00:00:00.000Z"),
  });
  assert.equal(demoted.state, "contradicted");
  assert.ok(demoted.revisions.some((r) => r.from === "promoted-to-working-knowledge"));
});

test("every lifecycle transition records why (revision history)", () => {
  const h = supported().promote("survived challenge", T("2026-02-01T00:00:00.000Z"));
  assert.ok(h.revisions.length >= 1);
  for (const r of h.revisions) {
    assert.ok(r.cause.length > 0, "each revision must record a cause");
    assert.ok(r.from !== undefined && r.to !== undefined);
  }
});

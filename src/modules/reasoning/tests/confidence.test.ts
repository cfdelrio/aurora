// Spec 003 UC7 + confidence rules — claim-specific, never certainty; source conflict stays visible.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis } from "../index.ts";
import { T, aClaim, aScope, conflictedSignal, declaredFalsifiers, measuredSignal } from "./helpers.ts";

function fresh() {
  return Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() });
}

test("source conflict remains visible and constrains confidence; hypothesis may remain active", () => {
  const h = fresh().attachEvidence({
    signal: conflictedSignal(),
    direction: "supports",
    reasoningNote: "supports, but sources disagree",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  assert.equal(h.confidence.level, "limited");
  assert.ok(h.confidence.limitations.some((l) => l.includes("source conflict")));
  // conflict preserved on the evidence quality
  assert.equal(h.evidence[0]?.quality.status, "source-conflicted");
  assert.notEqual(h.state, "falsified");
  assert.notEqual(h.state, "retired");
});

test("contradiction caps confidence at limited and keeps the limitation visible", () => {
  const h = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "contradicts",
    reasoningNote: "flat retest",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(h.confidence.level, "limited");
  assert.ok(h.confidence.limitations.some((l) => l.includes("contradicted")));
});

test("confidence always carries limitations and never reads certain", () => {
  const h = fresh();
  assert.ok(Array.isArray(h.confidence.limitations));
  assert.notEqual(h.confidence.level as string, "certain");
});

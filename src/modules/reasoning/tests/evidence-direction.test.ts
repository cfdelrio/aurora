// Spec 003 UC3/UC4 — evidence direction drives state; contradiction stays visible; falsification preserves.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis } from "../index.ts";
import { T, aClaim, aScope, declaredFalsifiers, measuredSignal } from "./helpers.ts";

function fresh() {
  return Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() });
}

test("weakens -> weakened; contradicts -> contradicted (contradiction remains visible)", () => {
  const weakened = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "weakens",
    reasoningNote: "smaller effect than expected",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(weakened.state, "weakened");

  const contradicted = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "contradicts",
    reasoningNote: "flat retest",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(contradicted.state, "contradicted");
  // the contradicting case is recorded, not dropped
  assert.equal(contradicted.evidence.length, 1);
  assert.equal(contradicted.evidence[0]?.direction, "contradicts");
});

test("contextualizes moves proposed -> active without supporting or weakening", () => {
  const ctx = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "contextualizes",
    reasoningNote: "this occurred during a heatwave",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(ctx.state, "active");
});

test("falsifies satisfies a declared falsifier and moves the hypothesis to falsified (preserved)", () => {
  const falsified = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "falsifies",
    reasoningNote: "the declared falsifier condition was met",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(falsified.state, "falsified");
  // preserved, not deleted; why-it-died is visible
  assert.equal(falsified.evidence.length, 1);
  assert.equal(falsified.evidence[0]?.direction, "falsifies");
  assert.ok(falsified.revisions.some((r) => r.to === "falsified"));
  // falsified is not active support
  assert.equal(falsified.isActiveSupport(), false);
});

test("a falsified hypothesis receives no further evidence", () => {
  const falsified = fresh().attachEvidence({
    signal: measuredSignal(),
    direction: "falsifies",
    reasoningNote: "met falsifier",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.throws(() =>
    falsified.attachEvidence({
      signal: measuredSignal(),
      direction: "supports",
      reasoningNote: "too late",
      at: T("2026-01-03T09:00:00.000Z"),
    }),
  );
});

// Spec 003 UC2 — attach a Signal as a supporting EvidenceCase, preserving traceability.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis } from "../index.ts";
import { observationQuality } from "../../observation/index.ts";
import { T, aClaim, aScope, declaredFalsifiers, measuredBundle } from "./helpers.ts";

test("attaching a Signal creates an EvidenceCase inside the Hypothesis, traceable to the observation", () => {
  const { set, observation, signal } = measuredBundle();
  const h0 = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() });

  const h1 = h0.attachEvidence({
    signal,
    direction: "supports",
    reasoningNote: "threshold-level effort sustained beyond the usual",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  // immutable-by-operation: h0 unchanged
  assert.equal(h0.evidence.length, 0);
  assert.equal(h1.evidence.length, 1);

  const ec = h1.evidence[0];
  assert.ok(ec);
  assert.equal(ec.direction, "supports");
  // traceability: EvidenceCase -> Signal -> Observation -> ObservationSet
  assert.equal(ec.trace.observationSetId, set.id);
  assert.deepEqual([...ec.trace.observationIds], [observation.id]);
  assert.deepEqual([...ec.trace.references], [observation.provenance.reference]);
  // quality carried
  assert.equal(ec.quality.status, observation.quality.status);
});

test("supporting evidence may raise confidence but never to certainty; claim stays defeasible", () => {
  const { signal } = measuredBundle();
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() }).attachEvidence({
    signal,
    direction: "supports",
    reasoningNote: "supports the claim",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  assert.equal(h.state, "supported");
  assert.equal(h.confidence.level, "moderate"); // rose from tentative, not certain
  assert.notEqual(h.confidence.level as string, "certain");
});

test("EvidenceCase preserves Signal quality limitations (degraded travels through)", () => {
  const { signal } = measuredBundle(observationQuality("partial", "intermittent dropout"));
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() }).attachEvidence({
    signal,
    direction: "supports",
    reasoningNote: "supports despite dropout",
    at: T("2026-01-02T09:00:00.000Z"),
  });
  assert.equal(h.evidence[0]?.quality.status, "partial");
  assert.ok(h.confidence.limitations.some((l) => l.includes("degraded")));
});

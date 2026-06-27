// Spec 003 UC8/UC9 — missing-data origin and self-report wording remain traceable.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Hypothesis } from "../index.ts";
import { T, aClaim, aScope, declaredFalsifiers, missingDataSignal, subjectiveBundle } from "./helpers.ts";

test("a missing-data Signal can be attached; its origin stays traceable; it does not auto-support", () => {
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() }).attachEvidence({
    signal: missingDataSignal(),
    direction: "contextualizes",
    reasoningNote: "HR was expected but absent for this session",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  const ec = h.evidence[0];
  assert.ok(ec);
  // explicit direction; not silently turned into support
  assert.equal(ec.direction, "contextualizes");
  // missing-data origin is traceable through the signal
  assert.equal(ec.trace.signal.questionTopic, "absence:heart-rate");
  assert.equal(ec.trace.signal.direction, "absent");
  assert.equal(ec.trace.observationIds.length, 1);
});

test("a self-report Signal keeps the athlete's verbatim wording traceable through to the observation", () => {
  const { set, observation, words, signal } = subjectiveBundle("I stopped because something felt wrong.");
  const h = Hypothesis.open({ claim: aClaim(), scope: aScope(), falsifiers: declaredFalsifiers() }).attachEvidence({
    signal,
    direction: "weakens",
    reasoningNote: "athlete reports something felt wrong",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  const ec = h.evidence[0];
  assert.ok(ec);
  // the EvidenceCase traces to the original observation id in the set...
  const originalId = ec.trace.observationIds[0];
  assert.equal(originalId, observation.id);
  // ...and resolving it in the ObservationSet yields the verbatim words (not copied onto the claim)
  const original = set.active().find((o) => o.id === originalId);
  assert.ok(original && original.kind === "subjective");
  if (original && original.kind === "subjective") {
    assert.equal(original.words, words);
  }
});

// Spec 002 UC3 — rejection is auditable and preserves the original observation.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contextualFrame,
  detectSignals,
  recordObservationSet,
  qualityComplete,
} from "../../index.ts";
import { deviceProvenance } from "../helpers.ts";

test("a rejection carries an explicit reason and remains traceable to the original", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
      },
    ],
  });

  const [outcome] = detectSignals({
    set,
    frameFor: () =>
      contextualFrame({ expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  });

  assert.equal(outcome?.outcome, "rejection");
  if (outcome?.outcome === "rejection") {
    assert.equal(outcome.reason, "expected-normal-variation");
    // traceable: the original observation is reachable and still present in the set
    const originalId = outcome.trace.observationIds[0];
    assert.ok(set.active().some((o) => o.id === originalId));
  }
});

test("rejection does not delete, mutate, or downgrade the candidate", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete("clean"),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
      },
    ],
  });
  const before = set.active()[0];

  detectSignals({
    set,
    frameFor: () =>
      contextualFrame({ expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  });

  const after = set.active()[0];
  // unchanged: same object, same quality, still frozen
  assert.equal(after, before);
  assert.equal(after?.quality.status, "complete");
  assert.equal(Object.isFrozen(after), true);
});

test("every observation yields an outcome — nothing is silently dropped", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" }, // -> rejection
      },
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" }, // -> signal
      },
    ],
  });

  const outcomes = detectSignals({
    set,
    frameFor: () =>
      contextualFrame({ purpose: "x", expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  });

  assert.equal(outcomes.length, 2);
  assert.equal(outcomes.filter((o) => o.outcome === "signal").length, 1);
  assert.equal(outcomes.filter((o) => o.outcome === "rejection").length, 1);
});

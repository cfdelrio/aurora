// Spec 001 invariant — observations are immutable; they may be superseded, never overwritten.

import { test } from "node:test";
import assert from "node:assert/strict";

import { measuredObservation, qualityComplete } from "../index.ts";
import { deviceProvenance } from "./helpers.ts";

test("a constructed observation is frozen", () => {
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 156, unit: "bpm" },
  });
  assert.equal(Object.isFrozen(obs), true);
  assert.equal(Object.isFrozen(obs.measurement), true);
  assert.equal(Object.isFrozen(obs.provenance), true);
  assert.equal(Object.isFrozen(obs.quality), true);
});

test("mutating an observation in place throws (no overwrite)", () => {
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 156, unit: "bpm" },
  });

  assert.throws(() => {
    (obs as unknown as { magnitude: number }).magnitude = 999;
  });
  assert.throws(() => {
    (obs.measurement as unknown as { magnitude: number }).magnitude = 999;
  });
  // value unchanged
  assert.equal(obs.measurement.magnitude, 156);
});

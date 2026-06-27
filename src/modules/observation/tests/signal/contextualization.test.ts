// Spec 002 UC1 — contextualization frames an observation without mutating it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  contextualFrame,
  contextualize,
  measuredObservation,
  ObservationSet,
  observationQuality,
  qualityComplete,
} from "../../index.ts";
import { deviceProvenance } from "../helpers.ts";

test("contextualize preserves provenance and quality, and does not mutate the original", () => {
  const set = ObservationSet.create({ occasion: "ride" });
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: observationQuality("suspicious", "210 contradicts neighbours"),
    measurement: { quantity: "heart-rate", magnitude: 210, unit: "bpm" },
  });

  const ctx = contextualize({
    observation: obs,
    observationSetId: set.id,
    frame: contextualFrame({ expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  });

  // original untouched (still frozen, same value)
  assert.equal(Object.isFrozen(obs), true);
  assert.equal(obs.measurement.magnitude, 210);

  // provenance traceable, quality carried
  assert.equal(ctx.trace.observationSetId, set.id);
  assert.deepEqual([...ctx.trace.observationIds], [obs.id]);
  assert.deepEqual([...ctx.trace.references], [obs.provenance.reference]);
  assert.equal(ctx.quality.status, "suspicious");
});

test("a contextualized observation names missing context explicitly and carries no verdict", () => {
  const set = ObservationSet.create({ occasion: "ride" });
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete(),
    measurement: { quantity: "power", magnitude: 250, unit: "w" },
  });

  const ctx = contextualize({
    observation: obs,
    observationSetId: set.id,
    frame: contextualFrame({ missingContext: ["baseline"] }),
  });

  assert.deepEqual([...ctx.frame.missingContext], ["baseline"]);
  // a contextualized observation is not a signal: it has no direction/relevance/meaning
  const keys = Object.keys(ctx);
  for (const forbidden of ["direction", "salience", "questionTopic", "relevance", "meaning"]) {
    assert.equal(keys.includes(forbidden), false, `must not carry '${forbidden}'`);
  }
});

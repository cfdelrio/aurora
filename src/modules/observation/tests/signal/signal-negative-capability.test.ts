// THE DEFINING TESTS — a Signal notices relevance; it never claims meaning.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as observationModule from "../../index.ts";
import {
  contextualFrame,
  detectSignals,
  recordObservationSet,
  qualityComplete,
} from "../../index.ts";
import { deviceProvenance } from "../helpers.ts";

const FORBIDDEN_SURFACE =
  /hypothesis|evidence|impact|understanding|decision|recommend|fatigue|readiness|capacity/i;

const FORBIDDEN_FIELDS = [
  "fatigue",
  "readiness",
  "capacity",
  "impact",
  "cause",
  "evidence",
  "hypothesis",
  "recommendation",
  "decision",
  "state",
  "meaning",
  "verdict",
];

function aSignal() {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
    ],
  });
  const outcome = detectSignals({
    set,
    frameFor: () =>
      contextualFrame({ expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  })[0];
  assert.ok(outcome && outcome.outcome === "signal");
  return outcome;
}

test("the module surface exposes no hypothesis/evidence/impact/understanding/decision symbol", () => {
  for (const name of Object.keys(observationModule)) {
    assert.equal(
      FORBIDDEN_SURFACE.test(name),
      false,
      `module must not export a meaning/inference symbol: '${name}'`,
    );
  }
});

test("the module provides no Hypothesis / Evidence / Impact constructor", () => {
  const surface = observationModule as unknown as Record<string, unknown>;
  for (const name of [
    "Hypothesis",
    "hypothesis",
    "EvidenceCase",
    "evidence",
    "ImpactAssessment",
    "impact",
    "UnderstandingProfile",
    "DecisionSupportCase",
  ]) {
    assert.equal(surface[name], undefined, `must not provide '${name}'`);
  }
});

test("a Signal carries no fatigue/readiness/capacity/impact/cause/evidence/recommendation field", () => {
  const sig = aSignal();
  const keys = Object.keys(sig);
  for (const forbidden of FORBIDDEN_FIELDS) {
    assert.equal(keys.includes(forbidden), false, `Signal must not have field '${forbidden}'`);
  }
  // it DOES carry only relevance-level facts
  assert.deepEqual(
    keys.sort(),
    ["direction", "frame", "outcome", "quality", "questionTopic", "salience", "source", "trace"].sort(),
  );
});

test("detection only ever returns a Signal or a SignalRejection — never a hypothesis/evidence/impact object", () => {
  const set = recordObservationSet({
    occasion: "ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 205, unit: "bpm" },
      },
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
      },
    ],
  });
  const outcomes = detectSignals({
    set,
    frameFor: () =>
      contextualFrame({ expectedRange: { quantity: "heart-rate", low: 120, high: 180, unit: "bpm" } }),
  });
  for (const o of outcomes) {
    assert.ok(o.outcome === "signal" || o.outcome === "rejection");
  }
});

// THE DEFINING TESTS — prove the observation module cannot manufacture meaning.
// This first code must not show that Aurora understands. It must show that Aurora can record without interpreting.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as observationModule from "../index.ts";
import {
  measuredObservation,
  missingDataObservation,
  qualityComplete,
  recordObservationSet,
  subjectiveObservation,
} from "../index.ts";
import { deviceProvenance, athleteProvenance } from "./helpers.ts";

const FORBIDDEN_SURFACE =
  /signal|hypothesis|evidence|impact|understanding|decision|recommend|infer|fatigue|readiness|detect|score/i;

const FORBIDDEN_FIELDS = [
  "signal",
  "hypothesis",
  "evidence",
  "impact",
  "understanding",
  "decision",
  "recommendation",
  "fatigue",
  "readiness",
  "meaning",
  "interpretation",
  "isHard",
  "isEasy",
  "score",
  "verdict",
];

test("the module's public surface exposes intake only — no signal/hypothesis/evidence/inference", () => {
  const exported = Object.keys(observationModule);
  assert.ok(exported.length > 0, "module should export intake operations");
  for (const name of exported) {
    assert.equal(
      FORBIDDEN_SURFACE.test(name),
      false,
      `module must not export anything matching meaning/inference: '${name}'`,
    );
  }
});

test("the module cannot create a Signal, Hypothesis, or Evidence (no such constructors exist)", () => {
  const surface = observationModule as unknown as Record<string, unknown>;
  for (const name of ["Signal", "signal", "Hypothesis", "hypothesis", "EvidenceCase", "evidence"]) {
    assert.equal(surface[name], undefined, `must not provide '${name}'`);
  }
});

test("no observation carries an inferred-meaning field", () => {
  const measured = measuredObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 156, unit: "bpm" },
  });
  const subjective = subjectiveObservation({
    provenance: athleteProvenance(),
    quality: qualityComplete("athlete-reported"),
    words: "I felt heavy.",
  });
  const missing = missingDataObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete("absent"),
    expected: "sleep",
  });

  for (const obs of [measured, subjective, missing]) {
    const keys = Object.keys(obs);
    for (const forbidden of FORBIDDEN_FIELDS) {
      assert.equal(
        keys.includes(forbidden),
        false,
        `observation kind '${obs.kind}' must not have field '${forbidden}'`,
      );
    }
  }
});

test("a recorded set holds raw observations only — no derived meaning anywhere", () => {
  const set = recordObservationSet({
    occasion: "2026-01-01-ride",
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "power", magnitude: 250, unit: "w" },
      },
    ],
  });

  // the set surfaces only intake/inspection, never an interpretation
  const setSurface = Object.getOwnPropertyNames(Object.getPrototypeOf(set));
  for (const name of setSurface) {
    assert.equal(
      FORBIDDEN_SURFACE.test(name),
      false,
      `ObservationSet must not expose meaning/inference method: '${name}'`,
    );
  }
});

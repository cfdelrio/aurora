// Spec 001 UC3 — missing expected data is first-class and never becomes evidence.

import { test } from "node:test";
import assert from "node:assert/strict";

import { recordObservationSet, missingDataObservation, qualityComplete } from "../index.ts";
import { deviceProvenance } from "./helpers.ts";

test("represents expected-but-absent data as MissingDataObservation", () => {
  const obs = missingDataObservation({
    provenance: deviceProvenance({ reference: "device:fit:no-hr" }),
    quality: qualityComplete("heart-rate stream absent for a session where HR was expected"),
    expected: "heart-rate",
  });

  assert.equal(obs.kind, "missing-data");
  assert.equal(obs.expected, "heart-rate");
});

test("missing data raises set incompleteness without inferring meaning", () => {
  const set = recordObservationSet({
    occasion: "2026-01-01-ride-no-hr",
    observations: [
      {
        kind: "missing-data",
        provenance: deviceProvenance({ reference: "device:fit:no-hr" }),
        quality: qualityComplete("HR expected but absent"),
        expected: "heart-rate",
      },
    ],
  });

  assert.equal(set.completeness().complete, false);
  assert.deepEqual(set.completeness().missing, ["heart-rate"]);
});

test("a MissingDataObservation carries no meaning field", () => {
  const obs = missingDataObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete("absent"),
    expected: "sleep",
  });
  const keys = Object.keys(obs);
  for (const forbidden of ["fatigue", "readiness", "impact", "meaning", "interpretation"]) {
    assert.equal(keys.includes(forbidden), false, `must not have '${forbidden}'`);
  }
});

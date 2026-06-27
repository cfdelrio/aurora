// Spec 001 UC1 — create ObservationSet from recorded input.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ObservationSet,
  measuredObservation,
  qualityComplete,
  recordObservationSet,
} from "../index.ts";
import { deviceProvenance, ts } from "./helpers.ts";

test("creates an ObservationSet with occasion, source, provenance, and explicit completeness", () => {
  const set = recordObservationSet({
    occasion: "2026-01-01-morning-ride",
    expected: ["heart-rate", "power"],
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 156, unit: "bpm" },
      },
      {
        kind: "measured",
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "power", magnitude: 250, unit: "w" },
      },
    ],
  });

  assert.equal(set.occasion, "2026-01-01-morning-ride");
  assert.equal(set.active().length, 2);
  assert.equal(set.completeness().complete, true);
  assert.deepEqual(set.completeness().missing, []);

  const range = set.timeRange();
  assert.ok(range, "time range should be derivable");
  assert.equal(range.from.iso, "2026-01-01T07:00:00.000Z");
});

test("each value is stored as an Observation with provenance and no inferred meaning", () => {
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: qualityComplete(),
    measurement: { quantity: "heart-rate", magnitude: 156, unit: "bpm" },
  });

  assert.equal(obs.kind, "measured");
  assert.equal(obs.provenance.source, "device");
  assert.equal(obs.provenance.reference, "device:fit:abc123");
  // raw measurement only — no interpretation
  assert.deepEqual(Object.keys(obs.measurement).sort(), ["magnitude", "quantity", "unit"]);
});

test("an incomplete set exposes its incompleteness explicitly", () => {
  const set = recordObservationSet({
    occasion: "2026-01-01-run",
    expected: ["heart-rate", "power"],
    observations: [
      {
        kind: "measured",
        provenance: deviceProvenance({ recordingTime: ts("2026-01-01T07:05:00.000Z") }),
        quality: qualityComplete(),
        measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
      },
    ],
  });

  assert.equal(set.completeness().complete, false);
  assert.deepEqual(set.completeness().missing, ["power"]);
});

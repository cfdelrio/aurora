// Spec 001 UC4 + invariants — quality and provenance are required, travel, and conflicts are exposed.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ObservationSet,
  measuredObservation,
  observationQuality,
  qualityComplete,
} from "../index.ts";
import { provenance } from "../../../shared-kernel/provenance.ts";
import { deviceProvenance, ts } from "./helpers.ts";

test("records a quality status and reason that travel with the observation", () => {
  const obs = measuredObservation({
    provenance: deviceProvenance(),
    quality: observationQuality("suspicious", "210 bpm contradicts surrounding samples"),
    measurement: { quantity: "heart-rate", magnitude: 210, unit: "bpm" },
  });

  assert.equal(obs.quality.status, "suspicious");
  assert.equal(obs.quality.reason, "210 bpm contradicts surrounding samples");
});

test("a high-quality observation is not thereby meaningful, a low-quality one is not discarded", () => {
  const set = ObservationSet.create({ occasion: "q" })
    .add(
      measuredObservation({
        provenance: deviceProvenance(),
        quality: qualityComplete(),
        measurement: { quantity: "power", magnitude: 250, unit: "w" },
      }),
    )
    .add(
      measuredObservation({
        provenance: deviceProvenance(),
        quality: observationQuality("corrupted", "dropout"),
        measurement: { quantity: "power", magnitude: 0, unit: "w" },
      }),
    );

  // both retained: quality does not gate retention, and carries no meaning
  assert.equal(set.active().length, 2);
});

test("source conflict is exposed, never resolved", () => {
  const set = ObservationSet.create({ occasion: "conflict" })
    .add(
      measuredObservation({
        provenance: deviceProvenance({ source: "device" }),
        quality: observationQuality("source-conflicted", "device says recovered"),
        measurement: { quantity: "readiness-input", magnitude: 1, unit: "flag" },
      }),
    )
    .add(
      measuredObservation({
        provenance: deviceProvenance({ source: "athlete-report" }),
        quality: observationQuality("source-conflicted", "athlete says exhausted"),
        measurement: { quantity: "readiness-input", magnitude: 0, unit: "flag" },
      }),
    );

  const conflicts = set.sourceConflicts();
  assert.equal(conflicts.length, 2); // both preserved; neither wins
});

test("an observation cannot be constructed without provenance (provenance is never lost)", () => {
  assert.throws(() =>
    measuredObservation({
      // @ts-expect-error provenance is required
      provenance: undefined,
      quality: qualityComplete(),
      measurement: { quantity: "heart-rate", magnitude: 150, unit: "bpm" },
    }),
  );
});

test("provenance cannot be partially constructed", () => {
  assert.throws(() =>
    provenance({
      source: "device",
      captureTime: ts("2026-01-01T07:00:00.000Z"),
      // @ts-expect-error recordingTime required
      recordingTime: undefined,
      reference: "r",
    }),
  );
  assert.throws(() =>
    // empty reference is type-valid but refused at runtime (provenance never lost)
    provenance({
      source: "device",
      captureTime: ts("2026-01-01T07:00:00.000Z"),
      recordingTime: ts("2026-01-01T07:05:00.000Z"),
      reference: "",
    }),
  );
});

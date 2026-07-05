// Manual Data Trial 044-C — real training rows through the EXISTING 044-A1 production intake path.
// This is an EVIDENCE TRIAL, not a new feature: it runs a real Garmin CSV export (transcribed by hand —
// see 044-c-real-swim-session-fixture.ts) through the unmodified production chain
//   TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome
// and asserts exactly what was empirically observed. No bypass adapter, no direct Observation
// construction, no CSV parser — negatives are as defining as the positive findings.
//
//   this trial ≠ a new feature · a real CSV export ≠ truth · technical acceptance ≠ truth ·
//   Observation ≠ Evidence · Observation ≠ Signal · Aurora advises, the athlete decides.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import { realSwimSessionSubmission044C } from "./044-c-real-swim-session-fixture.ts";

function runTrial() {
  const submission = trainingRowSubmissionToManualInput(realSwimSessionSubmission044C);
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, outcome };
}

// --- input/mapping shape --------------------------------------------------------------------------

test("044-C.1 the real fixture has 18 input rows mapping to 21 ManualInputEntry (18 measured-value + 3 context-note)", () => {
  assert.equal(realSwimSessionSubmission044C.rows.length, 18);
  const { submission } = runTrial();
  assert.equal(submission.entries.length, 21);
  assert.equal(submission.entries.filter((e) => e.kind === "measured-value").length, 18);
  assert.equal(submission.entries.filter((e) => e.kind === "context-note").length, 3);
});

// --- the real outcome: fully accepted after Impl 044-C2A's grouped-thousands normalization ----------
// (was "partially-accepted" with exactly one limitation, "unparseable-numeric-value", before 044-C2A — see
// docs/trials/044-C-real-training-intake-trial.md §1/§5 for that original, historical, UNCHANGED finding)

test("044-C.2 the real submission is now fully accepted — Impl 044-C2A's grouped-thousands normalization closes the one original limitation", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 21);
  assert.deepEqual(outcome.limitations, []);
  assert.equal(outcome.quality, "complete");
});

// --- the row that ORIGINALLY failed: Garmin's comma-grouped "1,600" now normalizes to 1600 -----------

test("044-C.3 the raw comma-grouped source value ('1,600') now normalizes to the numeric value 1600 (Impl 044-C2A)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const distances = outcome.observationSet.observations.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance",
  );
  // all 3 real distance rows now made it in: csv-2's "0", csv-59's raw "1,600" (normalized), and
  // csv-134's manually-normalized "3600".
  assert.equal(distances.length, 3);
  const magnitudes = distances
    .map((o) => (o.kind === "measured" ? o.measurement.magnitude : undefined))
    .sort((a, b) => (a ?? 0) - (b ?? 0));
  assert.deepEqual(magnitudes, [0, 1600, 3600]);

  // proof: the specific observation sourced from csv-59's raw "1,600" carries magnitude 1600, "complete"
  // quality (distance is a recognized metric — normalization itself never causes "suspicious"), and a
  // quality.reason noting the normalization without claiming locale/device/source truth.
  const csv59Distance = distances.find((o) => o.provenance.reference.includes("row:csv-59"));
  assert.ok(csv59Distance && csv59Distance.kind === "measured");
  assert.equal(csv59Distance.measurement.magnitude, 1600);
  assert.equal(csv59Distance.quality.status, "complete");
  assert.ok(csv59Distance.quality.reason.includes("grouped-thousands"));
  for (const claim of ["locale", "device-accurate", "guaranteed"]) {
    assert.ok(!csv59Distance.quality.reason.toLowerCase().includes(claim));
  }
  // the original raw text remains recoverable in provenance — never silently overwritten.
  assert.ok(csv59Distance.provenance.reference.includes('raw-numeric:"1,600"'));
});

// --- unknown metrics: after Impl 044-C1A, swim-specific vocabulary (SWOLF, strokes, calories) is now
// recognized too — RECOGNIZED_METRICS grew from 15 to 18 entries (Spec 044-C1 / Tech Spec 044-C1A) --------

test("044-C.4 all 18 real admitted measured observations are recognized (complete) — zero suspicious", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious").map((o) => o.measurement.quantity);
  const complete = measured.filter((o) => o.quality.status === "complete").map((o) => o.measurement.quantity);

  // real finding (post-044-C1A): swolf/total-strokes/calories are now recognized — zero suspicious remain
  assert.equal(suspicious.length, 0);

  // all 18 measured rows are now "complete" — csv-59's raw "1,600" distance (Impl 044-C2A) is no longer
  // absent from this set; it is admitted like every other recognized-metric row.
  assert.equal(complete.length, 18);
  assert.ok(
    complete.every((m) =>
      ["distance", "duration", "avg-pace", "avg-heart-rate", "max-heart-rate", "swolf", "total-strokes", "calories"].includes(m),
    ),
  );
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations ------

test("044-C.5 sourceRowId, artifactRef, and deviceLabel are all preserved in Provenance.reference on real observations", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));

  assert.ok(bySourceRow("csv-2").length > 0);
  assert.ok(bySourceRow("csv-59").length > 0);
  assert.ok(bySourceRow("csv-134").length > 0);

  // artifactRef (the real Garmin activity id) is on EVERY observation, not just some
  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-23459651624"));
  }

  // deviceLabel was set on BOTH the csv-59 and csv-134 distance rows in the real fixture. Before Impl
  // 044-C2A, csv-59's distance row was exactly the one that failed to parse, so only csv-134's survived.
  // Now that "1,600" normalizes successfully, both survive.
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 2);
});

// --- notes: each note became its own separate context-note/subjective observation --------------------

test("044-C.6 the three real row notes each became a separate subjective (context-note) observation, never merged into a measurement", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const subjective = outcome.observationSet.observations.filter((o) => o.kind === "subjective");
  assert.equal(subjective.length, 3);
  const words = subjective.map((o) => (o.kind === "subjective" ? o.words : "")).sort();
  assert.ok(words.some((w) => w.includes("Descanso")));
  assert.ok(words.some((w) => w.includes("Mixto")));
  assert.ok(words.some((w) => w.includes("Resumen")));
});

// --- a real, genuinely-reported ZERO value is faithfully recorded, not treated as missing/invalid -----

test("044-C.7 a real, genuinely-reported zero-distance rest interval is recorded as a valid MeasuredObservation (0 is finite)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const restDistance = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance" && o.provenance.reference.includes("csv-2"),
  );
  assert.ok(restDistance && restDistance.kind === "measured");
  assert.equal(restDistance.measurement.magnitude, 0);
  assert.equal(restDistance.quality.status, "complete");
});

// --- negative capability: the real trial creates none of the downstream objects it must not ----------

test("044-C.8 the real trial creates no Signal/EvidenceCase/RenderingRequest and calls no session/delivery/AthleteDecision seam", () => {
  const { outcome } = runTrial();
  const json = JSON.stringify(outcome).toLowerCase();
  // "garmin" itself legitimately appears (in artifactRef/deviceLabel text) — check narrower, API-only tokens
  for (const banned of [
    "evidence", "signal", "renderingrequest", "runoperatorsession", "invokeoperatorsession",
    "athletedecision", "deliver", "hypothesis", "understanding", "garmin_api", "fitparse", "tcxparse",
  ]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

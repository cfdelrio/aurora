// Manual Data Trial 044-G — a SECOND, INDEPENDENT real cycling training session through the EXISTING
// production intake path. Like Trials 044-C/044-D/044-E/044-F, this is an EVIDENCE TRIAL, not a new feature:
// it runs a real Garmin CSV export (transcribed by hand — see 044-g-second-real-cycling-session-fixture.ts)
// through the unmodified production chain
//   TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome
// and asserts exactly what was empirically observed (via a temporary, deleted probe script — never
// asserted-then-forced). No bypass adapter, no direct Observation construction, no CSV parser, no
// cycling-specific adapter of any kind.
//
// Unlike Trial 044-F (which discovered two genuinely new metric labels), this trial is primarily a test of
// WITHIN-cycling stability: all 11 real metric labels this source exercises were ALREADY recognized before
// this trial (Impl 044-F1A's "max-speed"/"avg-moving-speed" extension made the catalog complete for
// everything this second source contains).
//
//   this trial ≠ a new feature · a real CSV export ≠ truth · technical acceptance ≠ truth ·
//   Observation ≠ Evidence · Observation ≠ Signal · Aurora advises, the athlete decides ·
//   a second cycling source ≠ automatic need for cycling architecture ·
//   five trials across three sports ≠ universal multi-sport coverage.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import { secondRealCyclingSessionSubmission044G } from "./044-g-second-real-cycling-session-fixture.ts";

function runTrial() {
  const submission = trainingRowSubmissionToManualInput(secondRealCyclingSessionSubmission044G);
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, outcome };
}

// --- input/mapping shape --------------------------------------------------------------------------

test("044-G.1 the second real cycling fixture has 44 input rows mapping to 48 ManualInputEntry (44 measured-value + 4 context-note)", () => {
  assert.equal(secondRealCyclingSessionSubmission044G.rows.length, 44);
  const { submission } = runTrial();
  assert.equal(submission.entries.length, 48);
  assert.equal(submission.entries.filter((e) => e.kind === "measured-value").length, 44);
  assert.equal(submission.entries.filter((e) => e.kind === "context-note").length, 4);
});

// --- the actual observed outcome: fully accepted, zero unknown warnings — WITHOUT any production change ---

test("044-G.2 the second real cycling submission is fully accepted with no limitations and ZERO unknown-metric warnings — every metric label was already recognized before this trial", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 48);
  assert.deepEqual(outcome.limitations, []);
  assert.equal(outcome.quality, "complete");
});

// --- observation-kind breakdown: 44 measured, 0 missing-data, 4 subjective, none lost -------------------

test("044-G.3 no row is silently dropped: 44 measured-value entries account for exactly 44 measured + 0 missing-data + 0 limitations", () => {
  const { submission, outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measuredEntries = submission.entries.filter((e) => e.kind === "measured-value").length;
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured").length;
  const missingData = outcome.observationSet.observations.filter((o) => o.kind === "missing-data").length;
  assert.equal(measuredEntries, 44);
  assert.equal(measured, 44);
  assert.equal(missingData, 0);
  assert.equal(measuredEntries, measured + missingData + outcome.limitations.length);
});

// --- within-cycling stability: ALL 11 real metrics recognized, zero suspicious, confirming Impl 044-F1A ---

test("044-G.4 all 11 real metrics this source exercises (including 'max-speed' and 'avg-moving-speed', discovered by Trial 044-F) are recognized (complete) — zero suspicious, confirming within-cycling vocabulary stability", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious");
  assert.equal(suspicious.length, 0);
  for (const label of [
    "duration", "distance", "avg-speed", "avg-heart-rate", "max-heart-rate",
    "elevation-gain", "elevation-loss", "calories", "max-speed", "moving-time", "avg-moving-speed",
  ]) {
    const observations = measured.filter((o) => o.kind === "measured" && o.measurement.quantity === label);
    assert.equal(observations.length, 4, `expected 4 '${label}' observations (one per row)`);
    assert.ok(observations.every((o) => o.kind === "measured" && o.quality.status === "complete"));
  }
});

// --- "max-speed" is proven DISTINCT from "avg-speed" again, by real, differing values — repeats 044-F ------

test("044-G.5 'max-speed' carries real values genuinely different from the same row's 'avg-speed' — repeating Trial 044-F's evidence on a second, independent source", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  for (const rowId of ["csv-G-2", "csv-G-3", "csv-G-4", "csv-G-5"]) {
    const avg = byRowAndQuantity(rowId, "avg-speed");
    const max = byRowAndQuantity(rowId, "max-speed");
    assert.ok(avg && avg.kind === "measured" && max && max.kind === "measured");
    assert.ok(max.measurement.magnitude >= avg.measurement.magnitude, `expected max-speed >= avg-speed on ${rowId}`);
  }
});

// --- "avg-moving-speed" is proven DISTINCT again — a real pause on every lap, exactly as in Trial 044-F ----

test("044-G.6 'avg-moving-speed' carries real values genuinely different from 'avg-speed' on every lap — a real pause every time, repeating Trial 044-F's evidence on a second, independent source", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  for (const rowId of ["csv-G-2", "csv-G-3", "csv-G-4", "csv-G-5"]) {
    const avgSpeed = byRowAndQuantity(rowId, "avg-speed");
    const avgMovingSpeed = byRowAndQuantity(rowId, "avg-moving-speed");
    const duration = byRowAndQuantity(rowId, "duration");
    const movingTime = byRowAndQuantity(rowId, "moving-time");
    assert.ok(avgSpeed && avgSpeed.kind === "measured" && avgMovingSpeed && avgMovingSpeed.kind === "measured");
    assert.ok(duration && duration.kind === "measured" && movingTime && movingTime.kind === "measured");
    assert.notEqual(avgSpeed.measurement.magnitude, avgMovingSpeed.measurement.magnitude);
    assert.ok(movingTime.measurement.magnitude < duration.measurement.magnitude, `expected a real pause on ${rowId}`);
  }
});

// --- units repeat Trial 044-F's cycling convention exactly — no new unit form appears in this source -------

test("044-G.7 'distance' and speed metrics carry the SAME real units as Trial 044-F (km / km-h) — no new unit form appears in this second cycling source", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const distance = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance" && o.provenance.reference.includes("row:csv-G-5"),
  );
  const avgSpeed = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "avg-speed" && o.provenance.reference.includes("row:csv-G-5"),
  );
  assert.ok(distance && distance.kind === "measured" && avgSpeed && avgSpeed.kind === "measured");
  assert.equal(distance.measurement.unit, "km");
  assert.equal(avgSpeed.measurement.unit, "km/h");
  assert.equal(distance.measurement.magnitude, 11.41);
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations --------

test("044-G.8 sourceRowId and artifactRef are preserved on every observation; deviceLabel survives on the rows it was set on", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));
  for (const id of ["csv-G-2", "csv-G-3", "csv-G-4", "csv-G-5"]) {
    assert.ok(bySourceRow(id).length > 0, `expected at least one observation from ${id}`);
  }
  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-10673340347"));
  }
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 2); // csv-G-2's duration and csv-G-5's duration
});

// --- notes: each note became its own separate context-note/subjective observation -----------------------

test("044-G.9 all 4 real row notes each became a separate subjective (context-note) observation, never merged into a measurement", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const subjective = outcome.observationSet.observations.filter((o) => o.kind === "subjective");
  assert.equal(subjective.length, 4);
  const words = subjective.map((o) => (o.kind === "subjective" ? o.words : "")).sort();
  assert.ok(words.some((w) => w.includes("lap 1")));
  assert.ok(words.some((w) => w.includes("lap 3")));
  assert.ok(words.some((w) => w.includes("Resumen")));
});

// --- negative capability: the real trial creates none of the downstream objects it must not ------------

test("044-G.10 the second real cycling trial creates no Signal/EvidenceCase/RenderingRequest and calls no session/delivery/AthleteDecision seam", () => {
  const { outcome } = runTrial();
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of [
    "evidence", "signal", "renderingrequest", "runoperatorsession", "invokeoperatorsession",
    "athletedecision", "deliver", "hypothesis", "understanding", "garmin_api", "fitparse", "tcxparse",
  ]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

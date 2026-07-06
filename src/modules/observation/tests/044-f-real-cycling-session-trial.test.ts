// Manual Data Trial 044-F — the FIRST real THIRD-SPORT (cycling) training session through the EXISTING
// production intake path. Like Trials 044-C/044-D/044-E, this is an EVIDENCE TRIAL, not a new feature: it
// runs a real Garmin CSV export (transcribed by hand — see 044-f-real-cycling-session-fixture.ts) through
// the unmodified production chain
//   TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome
// and asserts exactly what was empirically observed (via a temporary, deleted probe script — never
// asserted-then-forced). No bypass adapter, no direct Observation construction, no CSV parser, no
// cycling-specific adapter of any kind.
//
//   this trial ≠ a new feature · a real CSV export ≠ truth · technical acceptance ≠ truth ·
//   Observation ≠ Evidence · Observation ≠ Signal · Aurora advises, the athlete decides ·
//   first third-sport success ≠ universal multi-sport coverage — three sports, not universal coverage.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import { realCyclingSessionSubmission044F } from "./044-f-real-cycling-session-fixture.ts";

function runTrial() {
  const submission = trainingRowSubmissionToManualInput(realCyclingSessionSubmission044F);
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, outcome };
}

// --- input/mapping shape --------------------------------------------------------------------------

test("044-F.1 the real cycling fixture has 44 input rows mapping to 48 ManualInputEntry (44 measured-value + 4 context-note)", () => {
  assert.equal(realCyclingSessionSubmission044F.rows.length, 44);
  const { submission } = runTrial();
  assert.equal(submission.entries.length, 48);
  assert.equal(submission.entries.filter((e) => e.kind === "measured-value").length, 44);
  assert.equal(submission.entries.filter((e) => e.kind === "context-note").length, 4);
});

// --- the actual observed outcome: fully accepted on first contact, no limitations, no missing data -------

test("044-F.2 the real cycling submission is fully accepted with no limitations and no missing-data observations — the source contains zero '--' placeholders", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 48);
  assert.deepEqual(outcome.limitations, []);
  assert.equal(outcome.quality, "complete");
});

// --- observation-kind breakdown: 44 measured, 0 missing-data, 4 subjective, none lost -------------------

test("044-F.3 no row is silently dropped: 44 measured-value entries account for exactly 44 measured + 0 missing-data + 0 limitations", () => {
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

// --- cross-sport generalization: metrics recognized from swim/running arcs work correctly for cycling ---

test("044-F.4 metrics already recognized from prior arcs (avg-speed, elevation-gain, elevation-loss, moving-time) are recognized (complete) for cycling — a THIRD sport", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  for (const label of ["avg-speed", "elevation-gain", "elevation-loss", "moving-time", "distance", "duration", "avg-heart-rate", "max-heart-rate", "calories"]) {
    const observations = measured.filter((o) => o.kind === "measured" && o.measurement.quantity === label);
    assert.equal(observations.length, 4, `expected 4 '${label}' observations (one per row)`);
    assert.ok(observations.every((o) => o.kind === "measured" && o.quality.status === "complete"));
  }
});

// --- two genuinely NEW, distinct, unrecognized metrics — never seen in either swim or running trial -----

test("044-F.5 'max-speed' and 'avg-moving-speed' are genuinely new metric labels, admitted but flagged suspicious, never guessed as aliases", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious");
  assert.equal(suspicious.length, 8);
  for (const label of ["max-speed", "avg-moving-speed"]) {
    const observations = suspicious.filter((o) => o.kind === "measured" && o.measurement.quantity === label);
    assert.equal(observations.length, 4, `expected 4 suspicious '${label}' observations (one per row)`);
    assert.ok(observations.every((o) => o.kind === "measured" && o.quality.reason.includes("unrecognized metric name")));
  }
});

// --- "max-speed" is proven DISTINCT from "avg-speed" by real, differing values — not an alias -----------

test("044-F.6 'max-speed' carries real values genuinely different from the same row's 'avg-speed' — evidence it is a distinct metric, not an alias", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  for (const rowId of ["csv-F-2", "csv-F-3", "csv-F-4", "csv-F-5"]) {
    const avg = byRowAndQuantity(rowId, "avg-speed");
    const max = byRowAndQuantity(rowId, "max-speed");
    assert.ok(avg && avg.kind === "measured" && max && max.kind === "measured");
    assert.ok(max.measurement.magnitude >= avg.measurement.magnitude, `expected max-speed >= avg-speed on ${rowId}`);
  }
});

// --- "avg-moving-speed" is proven DISTINCT from "avg-speed" by a real pause on every lap ------------------

test("044-F.7 'avg-moving-speed' carries real values genuinely different from 'avg-speed' on every lap — a real pause every time, evidence of distinctness not an alias", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  for (const rowId of ["csv-F-2", "csv-F-3", "csv-F-4", "csv-F-5"]) {
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

// --- cross-sport unit variation: a THIRD distinct real unit convention (km/km-per-hour) --------------

test("044-F.8 'distance' and speed metrics carry real, honestly-preserved units that differ from BOTH swim (m/s-per-100m) and running (km/s-per-km) — a third unit convention, no normalization performed", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const distance = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance" && o.provenance.reference.includes("row:csv-F-5"),
  );
  const avgSpeed = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "avg-speed" && o.provenance.reference.includes("row:csv-F-5"),
  );
  assert.ok(distance && distance.kind === "measured" && avgSpeed && avgSpeed.kind === "measured");
  assert.equal(distance.measurement.unit, "km");
  assert.equal(avgSpeed.measurement.unit, "km/h");
  assert.equal(distance.measurement.magnitude, 11.3);
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations --------

test("044-F.9 sourceRowId and artifactRef are preserved on every observation; deviceLabel survives on the rows it was set on", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));
  for (const id of ["csv-F-2", "csv-F-3", "csv-F-4", "csv-F-5"]) {
    assert.ok(bySourceRow(id).length > 0, `expected at least one observation from ${id}`);
  }
  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-11178669974"));
  }
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 2); // csv-F-2's duration and csv-F-5's duration
});

// --- notes: each note became its own separate context-note/subjective observation -----------------------

test("044-F.10 all 4 real row notes each became a separate subjective (context-note) observation, never merged into a measurement", () => {
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

test("044-F.11 the first real cycling trial creates no Signal/EvidenceCase/RenderingRequest and calls no session/delivery/AthleteDecision seam", () => {
  const { outcome } = runTrial();
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of [
    "evidence", "signal", "renderingrequest", "runoperatorsession", "invokeoperatorsession",
    "athletedecision", "deliver", "hypothesis", "understanding", "garmin_api", "fitparse", "tcxparse",
  ]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

// Manual Data Trial 044-E — the FIRST real NON-SWIM training session through the EXISTING
// 044-A1/044-C1A/044-C2A/044-D1A/044-D2A production intake path. Like Trials 044-C/044-D, this is an
// EVIDENCE TRIAL, not a new feature: it runs a real Garmin CSV export (transcribed by hand — see
// 044-e-real-running-session-fixture.ts) through the unmodified production chain
//   TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome
// and asserts exactly what was empirically observed (via a temporary, deleted probe script — never
// asserted-then-forced). No bypass adapter, no direct Observation construction, no CSV parser, no
// running-specific adapter of any kind.
//
//   this trial ≠ a new feature · a real CSV export ≠ truth · technical acceptance ≠ truth ·
//   Observation ≠ Evidence · Observation ≠ Signal · Aurora advises, the athlete decides ·
//   first non-swim success ≠ universal multi-sport coverage — this is a THIRD data point, one sport change.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import { realRunningSessionSubmission044E } from "./044-e-real-running-session-fixture.ts";

function runTrial() {
  const submission = trainingRowSubmissionToManualInput(realRunningSessionSubmission044E);
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, outcome };
}

// --- input/mapping shape --------------------------------------------------------------------------

test("044-E.1 the real running fixture has 73 input rows mapping to 78 ManualInputEntry (73 measured-value + 5 context-note)", () => {
  assert.equal(realRunningSessionSubmission044E.rows.length, 73);
  const { submission } = runTrial();
  assert.equal(submission.entries.length, 78);
  assert.equal(submission.entries.filter((e) => e.kind === "measured-value").length, 73);
  assert.equal(submission.entries.filter((e) => e.kind === "context-note").length, 5);
});

// --- the actual observed outcome: fully accepted on first contact, no limitations ---------------------

test("044-E.2 the real running submission is fully accepted with no limitations — every '--' resolved through the existing MissingDataObservation path", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 78);
  assert.deepEqual(outcome.limitations, []);
  assert.equal(outcome.quality, "complete");
});

// --- observation-kind breakdown: 69 measured, 4 missing-data, 5 subjective, none lost ------------------

test("044-E.3 no row is silently dropped: 73 measured-value entries account for exactly 69 measured + 4 missing-data + 0 limitations", () => {
  const { submission, outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measuredEntries = submission.entries.filter((e) => e.kind === "measured-value").length;
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured").length;
  const missingData = outcome.observationSet.observations.filter((o) => o.kind === "missing-data").length;
  assert.equal(measuredEntries, 73);
  assert.equal(measured, 69);
  assert.equal(missingData, 4);
  assert.equal(measuredEntries, measured + missingData + outcome.limitations.length);
});

// --- the "--" placeholder generalizes to a THIRD independent real file and a different sport -----------

test("044-E.4 the real '--' placeholder is recognized identically for a RECOGNIZED metric (avg-power) and an UNRECOGNIZED one (avg-vertical-oscillation), plus a naturally-occurring case (elevation-gain)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const missing = outcome.observationSet.observations.filter((o) => o.kind === "missing-data");
  assert.equal(missing.length, 4);
  const expectedLabels = missing.map((m) => (m.kind === "missing-data" ? m.expected : "")).sort();
  assert.deepEqual(expectedLabels, ["avg-power", "avg-power", "avg-vertical-oscillation", "elevation-gain"]);
  for (const m of missing) {
    assert.ok(m.kind === "missing-data");
    assert.ok(!("measurement" in m), "a missing-data observation must carry no Measurement");
    assert.equal(m.quality.status, "missing");
    assert.ok(m.quality.reason.includes('"--"'));
  }
  // elevation-gain's missing instance comes specifically from csv-E-5 — the source's own naturally-occurring
  // gap (lap 4), not an entry engineered purely to test the mechanism.
  const elevationGainMissing = missing.find((m) => m.kind === "missing-data" && m.expected === "elevation-gain");
  assert.ok(elevationGainMissing && elevationGainMissing.provenance.reference.includes("row:csv-E-5"));
});

// --- "optimal-pace" generalizes across sports: still <= avg-pace on every real row, never an alias -----

test("044-E.5 'optimal-pace' generalizes to running: it is recognized (complete) and remains <= 'avg-pace' on every real row, exactly as in the swim trials", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  for (const rowId of ["csv-E-2", "csv-E-3", "csv-E-4", "csv-E-5", "csv-E-6"]) {
    const avg = byRowAndQuantity(rowId, "avg-pace");
    const optimal = byRowAndQuantity(rowId, "optimal-pace");
    assert.ok(avg && avg.kind === "measured" && optimal && optimal.kind === "measured");
    assert.equal(optimal.quality.status, "complete");
    assert.ok(optimal.measurement.magnitude <= avg.measurement.magnitude, `expected optimal-pace <= avg-pace on ${rowId}`);
  }
});

// --- "avg-cadence" is exercised by real data for the first time in this arc, and recognized ------------

test("044-E.6 'avg-cadence' is recognized (complete) — the first real evidence exercising it in this arc", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const cadences = outcome.observationSet.observations.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "avg-cadence",
  );
  assert.equal(cadences.length, 5);
  assert.ok(cadences.every((o) => o.kind === "measured" && o.quality.status === "complete"));
});

// --- five genuinely new, running-specific metric labels — admitted, flagged suspicious, never guessed --

test("044-E.7 five genuinely new running-specific metric labels are admitted but flagged suspicious — never rejected, never guessed as aliases", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious");
  const newLabels = ["elevation-loss", "max-cadence", "avg-stride-length", "moving-time", "avg-moving-pace"];
  for (const label of newLabels) {
    const observations = suspicious.filter((o) => o.kind === "measured" && o.measurement.quantity === label);
    assert.equal(observations.length, 5, `expected 5 suspicious '${label}' observations (one per row)`);
    assert.ok(observations.every((o) => o.kind === "measured" && o.quality.reason.includes("unrecognized metric name")));
  }
  assert.equal(suspicious.length, newLabels.length * 5);
});

// --- "moving-time" and "avg-moving-pace" are evidenced as genuinely DISTINCT from "duration"/"avg-pace" -

test("044-E.8 'moving-time'/'avg-moving-pace' carry real values genuinely different from 'duration'/'avg-pace' on the paused lap — evidence of distinctness, not an alias", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const byQuantity = (quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes("row:csv-E-5"),
    );
  const duration = byQuantity("duration");
  const movingTime = byQuantity("moving-time");
  const avgPace = byQuantity("avg-pace");
  const avgMovingPace = byQuantity("avg-moving-pace");
  assert.ok(duration && duration.kind === "measured" && movingTime && movingTime.kind === "measured");
  assert.ok(avgPace && avgPace.kind === "measured" && avgMovingPace && avgMovingPace.kind === "measured");
  assert.equal(duration.measurement.magnitude, 145.5);
  assert.equal(movingTime.measurement.magnitude, 24);
  assert.notEqual(duration.measurement.magnitude, movingTime.measurement.magnitude);
  assert.equal(avgPace.measurement.magnitude, 1727);
  assert.equal(avgMovingPace.measurement.magnitude, 285);
  assert.notEqual(avgPace.measurement.magnitude, avgMovingPace.measurement.magnitude);
});

// --- cross-sport unit variation: "distance" and pace metrics use different real units than in swim ------

test("044-E.9 'distance' and pace metrics carry real, honestly-preserved units that differ from the swim trials (km vs m, s/km vs s/100m) — no unit normalization performed", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const distance = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance" && o.provenance.reference.includes("row:csv-E-6"),
  );
  const avgPace = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "avg-pace" && o.provenance.reference.includes("row:csv-E-6"),
  );
  assert.ok(distance && distance.kind === "measured" && avgPace && avgPace.kind === "measured");
  assert.equal(distance.measurement.unit, "km");
  assert.equal(avgPace.measurement.unit, "s/km");
  assert.equal(distance.measurement.magnitude, 3.08);
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations --------

test("044-E.10 sourceRowId and artifactRef are preserved on every observation; deviceLabel survives on the rows it was set on", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));
  for (const id of ["csv-E-2", "csv-E-3", "csv-E-4", "csv-E-5", "csv-E-6"]) {
    assert.ok(bySourceRow(id).length > 0, `expected at least one observation from ${id}`);
  }
  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-17390160500"));
  }
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 2); // csv-E-2's duration and csv-E-6's duration
});

// --- notes: each note became its own separate context-note/subjective observation -----------------------

test("044-E.11 all 5 real row notes each became a separate subjective (context-note) observation, never merged into a measurement", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const subjective = outcome.observationSet.observations.filter((o) => o.kind === "subjective");
  assert.equal(subjective.length, 5);
  const words = subjective.map((o) => (o.kind === "subjective" ? o.words : "")).sort();
  assert.ok(words.some((w) => w.includes("lap 1")));
  assert.ok(words.some((w) => w.includes("lap 4")));
  assert.ok(words.some((w) => w.includes("Resumen")));
});

// --- negative capability: the real trial creates none of the downstream objects it must not ------------

test("044-E.12 the first real running trial creates no Signal/EvidenceCase/RenderingRequest and calls no session/delivery/AthleteDecision seam", () => {
  const { outcome } = runTrial();
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of [
    "evidence", "signal", "renderingrequest", "runoperatorsession", "invokeoperatorsession",
    "athletedecision", "deliver", "hypothesis", "understanding", "garmin_api", "fitparse", "tcxparse",
  ]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

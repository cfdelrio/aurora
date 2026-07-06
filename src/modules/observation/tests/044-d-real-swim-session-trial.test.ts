// Manual Data Trial 044-D — a SECOND real training session through the EXISTING 044-A1/044-C1A/044-C2A
// production intake path. Like Trial 044-C, this is an EVIDENCE TRIAL, not a new feature: it runs a real
// Garmin CSV export (transcribed by hand — see 044-d-real-swim-session-fixture.ts) through the unmodified
// production chain
//   TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome
// and asserts exactly what was empirically observed (via a temporary, deleted probe script — never
// asserted-then-forced). No bypass adapter, no direct Observation construction, no CSV parser.
//
//   this trial ≠ a new feature · a real CSV export ≠ truth · technical acceptance ≠ truth ·
//   Observation ≠ Evidence · Observation ≠ Signal · Aurora advises, the athlete decides ·
//   one successful trial ≠ universal coverage — this is a SECOND data point, not proof of swim coverage.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import { realSwimSessionSubmission044D } from "./044-d-real-swim-session-fixture.ts";

function runTrial() {
  const submission = trainingRowSubmissionToManualInput(realSwimSessionSubmission044D);
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, outcome };
}

// --- input/mapping shape --------------------------------------------------------------------------

test("044-D.1 the second real fixture has 36 input rows mapping to 41 ManualInputEntry (36 measured-value + 5 context-note)", () => {
  assert.equal(realSwimSessionSubmission044D.rows.length, 36);
  const { submission } = runTrial();
  assert.equal(submission.entries.length, 41);
  assert.equal(submission.entries.filter((e) => e.kind === "measured-value").length, 36);
  assert.equal(submission.entries.filter((e) => e.kind === "context-note").length, 5);
});

// --- Impl 044-D2A: the real "--" placeholder is now a known, source-declared absence — fully accepted -----
// (was "partially-accepted" with exactly one limitation, "unparseable-numeric-value", before 044-D2A — see
// docs/trials/044-D-second-real-swim-session-intake-trial.md §1/§6 for that original, historical, UNCHANGED
// finding)

test("044-D.2 the second real submission is now fully accepted — Impl 044-D2A's known-missing-value recognition closes the one remaining limitation", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 41);
  assert.deepEqual(outcome.limitations, []);
  assert.equal(outcome.quality, "complete");
});

// --- the row that ORIGINALLY failed: Garmin's own "--" blank-field placeholder is now a MissingDataObservation

test("044-D.3 the raw '--' placeholder (csv-D-5's avg-strokes-per-length) now produces the existing MissingDataObservation, not a limitation (Impl 044-D2A)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const csvD5 = outcome.observationSet.observations.filter((o) => o.provenance.reference.includes("row:csv-D-5"));
  // csv-D-5 now contributes 3 observations: 2 measured (distance, avg-heart-rate) + 1 missing-data
  // (avg-strokes-per-length) — no entry is silently dropped, and no numeric magnitude is invented.
  assert.equal(csvD5.length, 3);
  const missing = csvD5.find((o) => o.kind === "missing-data");
  assert.ok(missing && missing.kind === "missing-data");
  assert.equal(missing.expected, "avg-strokes-per-length");
  assert.ok(!("measurement" in missing), "a missing-data observation must carry no Measurement/magnitude");
  assert.equal(missing.quality.status, "missing");
  assert.ok(missing.quality.reason.includes('"--"'), "the raw source token must remain preserved in the reason");
  assert.ok(missing.quality.reason.toLowerCase().includes("unavailable"));
  for (const claim of ["sensor", "malfunction", "device fail", "zero"]) {
    assert.ok(!missing.quality.reason.toLowerCase().includes(claim), `reason must not claim '${claim}'`);
  }
});

// --- the grouped-thousands rule (Impl 044-C2A) generalizes to a SECOND real session and a SECOND metric ---

test("044-D.4 the grouped-thousands rule normalizes both real comma values here ('3,200' distance and '1,125' total-strokes), not just distance", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const distances = outcome.observationSet.observations.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance",
  );
  const strokes = outcome.observationSet.observations.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "total-strokes",
  );
  assert.equal(distances.length, 5); // csv-D-2 (0), csv-D-4 (50), csv-D-5 (50), csv-D-7 (400), csv-D-136 (3,200)
  assert.equal(strokes.length, 3); // csv-D-4 (27), csv-D-7 (215), csv-D-136 (1,125)

  const summaryDistance = distances.find((o) => o.provenance.reference.includes("row:csv-D-136"));
  const summaryStrokes = strokes.find((o) => o.provenance.reference.includes("row:csv-D-136"));
  assert.ok(summaryDistance && summaryDistance.kind === "measured");
  assert.ok(summaryStrokes && summaryStrokes.kind === "measured");
  assert.equal(summaryDistance.measurement.magnitude, 3200);
  assert.equal(summaryStrokes.measurement.magnitude, 1125);
  // both normalized values keep "complete" quality (both are recognized metrics) and preserve the raw text
  assert.equal(summaryDistance.quality.status, "complete");
  assert.equal(summaryStrokes.quality.status, "complete");
  assert.ok(summaryDistance.provenance.reference.includes('raw-numeric:"3,200"'));
  assert.ok(summaryStrokes.provenance.reference.includes('raw-numeric:"1,125"'));
});

// --- Impl 044-D1A: "optimal-pace" and "avg-strokes-per-length" are now recognized (complete) — zero
// remaining unknown-metric warnings from this trial. Recognizing the LABEL is not a claim that Garmin's
// exact "Ritmo óptimo" formula is known, nor that avg-strokes-per-length is computed at runtime from
// total-strokes/lengths — recognition only removes the warning (Spec 044-D1 §2/§7; Tech Spec 044-D1A §1). --

test("044-D.5 'optimal-pace' and 'avg-strokes-per-length' are now recognized (complete) after Impl 044-D1A's vocabulary extension — zero suspicious", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious");
  assert.equal(suspicious.length, 0);

  const optimalPace = measured.filter((o) => o.kind === "measured" && o.measurement.quantity === "optimal-pace");
  const avgStrokesPerLength = measured.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "avg-strokes-per-length",
  );
  assert.equal(optimalPace.length, 3);
  assert.equal(avgStrokesPerLength.length, 3); // the 4th real instance (csv-D-5's "--") still never parses — see 044-D.3
  assert.ok(optimalPace.every((o) => o.kind === "measured" && o.quality.status === "complete"));
  assert.ok(avgStrokesPerLength.every((o) => o.kind === "measured" && o.quality.status === "complete"));
});

// --- "optimal-pace" is proven DISTINCT from "avg-pace" by real, differing values — not an alias -------

test("044-D.6 'optimal-pace' carries real values genuinely different from the same row's 'avg-pace' — evidence it is a distinct metric, not an alias", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const byRowAndQuantity = (rowId: string, quantity: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === quantity && o.provenance.reference.includes(`row:${rowId}`),
    );
  const cases: Array<[string, number, number]> = [
    ["csv-D-7", 115, 75], // avg-pace, optimal-pace
    ["csv-D-136", 81, 28],
  ];
  for (const [rowId, avgPace, optimalPace] of cases) {
    const avg = byRowAndQuantity(rowId, "avg-pace");
    const optimal = byRowAndQuantity(rowId, "optimal-pace");
    assert.ok(avg && avg.kind === "measured" && optimal && optimal.kind === "measured");
    assert.equal(avg.measurement.magnitude, avgPace);
    assert.equal(optimal.measurement.magnitude, optimalPace);
    assert.notEqual(avg.measurement.magnitude, optimal.measurement.magnitude);
  }
});

// --- a real, structural duplicate: csv-D-5 near-duplicates csv-D-4 with a differing avg-heart-rate ------

test("044-D.7 a real, near-duplicate sub-lap row (csv-D-5) is recorded as its own separate observation with its own differing avg-heart-rate (99), never merged with csv-D-4's (108)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const hrByRow = (rowId: string) =>
    outcome.observationSet.observations.find(
      (o) => o.kind === "measured" && o.measurement.quantity === "avg-heart-rate" && o.provenance.reference.includes(`row:${rowId}`),
    );
  const csvD4Hr = hrByRow("csv-D-4");
  const csvD5Hr = hrByRow("csv-D-5");
  assert.ok(csvD4Hr && csvD4Hr.kind === "measured" && csvD5Hr && csvD5Hr.kind === "measured");
  assert.equal(csvD4Hr.measurement.magnitude, 108);
  assert.equal(csvD5Hr.measurement.magnitude, 99);
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations ------

test("044-D.8 sourceRowId and artifactRef are preserved on every observation; deviceLabel survives on the rows it was set on", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));

  for (const id of ["csv-D-2", "csv-D-4", "csv-D-5", "csv-D-7", "csv-D-136"]) {
    assert.ok(bySourceRow(id).length > 0, `expected at least one observation from ${id}`);
  }

  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-23358314497"));
  }

  // deviceLabel was set on csv-D-7's and csv-D-136's distance rows in the real fixture — both succeeded,
  // so both survive (unlike Trial 044-C, where the device-labeled row was exactly the one that failed).
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 2);
});

// --- notes: each note became its own separate context-note/subjective observation --------------------

test("044-D.9 all 5 real row notes each became a separate subjective (context-note) observation, never merged into a measurement", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const subjective = outcome.observationSet.observations.filter((o) => o.kind === "subjective");
  assert.equal(subjective.length, 5);
  const words = subjective.map((o) => (o.kind === "subjective" ? o.words : "")).sort();
  assert.ok(words.some((w) => w.includes("Descanso")));
  assert.ok(words.some((w) => w.includes("Estilo libre")));
  assert.ok(words.some((w) => w.includes("nested sub-lap")));
  assert.ok(words.some((w) => w.includes("Mixto")));
  assert.ok(words.some((w) => w.includes("Resumen")));
});

// --- a real, genuinely-reported ZERO value is faithfully recorded, not treated as missing/invalid -----

test("044-D.10 a real, genuinely-reported zero-distance rest interval is recorded as a valid MeasuredObservation (0 is finite)", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const restDistance = outcome.observationSet.observations.find(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance" && o.provenance.reference.includes("csv-D-2"),
  );
  assert.ok(restDistance && restDistance.kind === "measured");
  assert.equal(restDistance.measurement.magnitude, 0);
  assert.equal(restDistance.quality.status, "complete");
});

// --- no row silently dropped: every attempted measured-value entry became EXACTLY one of measured / -----
// missing-data / limitation — a three-way partition since Impl 044-D2A (was two-way before it) -----------

test("044-D.11 no row is silently dropped: 36 attempted measured-value entries account for exactly 35 measured + 1 missing-data + 0 limitations", () => {
  const { submission, outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measuredEntries = submission.entries.filter((e) => e.kind === "measured-value").length;
  const admittedMeasured = outcome.observationSet.observations.filter((o) => o.kind === "measured").length;
  const admittedMissingData = outcome.observationSet.observations.filter((o) => o.kind === "missing-data").length;
  assert.equal(measuredEntries, 36);
  assert.equal(admittedMeasured, 35);
  assert.equal(admittedMissingData, 1);
  assert.equal(outcome.limitations.length, 0);
  assert.equal(measuredEntries, admittedMeasured + admittedMissingData + outcome.limitations.length);
});

// --- negative capability: the real trial creates none of the downstream objects it must not ----------

test("044-D.12 the second real trial creates no Signal/EvidenceCase/RenderingRequest and calls no session/delivery/AthleteDecision seam", () => {
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

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

// --- the real outcome: partially-accepted, exactly one limitation ----------------------------------

test("044-C.2 the real submission is partially-accepted with exactly one limitation (unparseable-numeric-value)", () => {
  const { outcome } = runTrial();
  assert.equal(outcome.status, "partially-accepted");
  assert.equal(outcome.acceptedCount, 20);
  assert.deepEqual(outcome.limitations, ["unparseable-numeric-value"]);
  assert.equal(outcome.quality, "partial");
});

// --- the ONE real-data failure: Garmin's comma-grouped "1,600" is not parsed as a number -----------

test("044-C.3 the raw comma-grouped source value ('1,600') is the row that failed — a genuine real-data finding", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const distances = outcome.observationSet.observations.filter(
    (o) => o.kind === "measured" && o.measurement.quantity === "distance",
  );
  // only 2 of the 3 real distance rows made it in (csv-2's "0" and csv-134's manually-normalized "3600");
  // csv-59's raw "1,600" is the one that failed to parse.
  assert.equal(distances.length, 2);
  const magnitudes = distances.map((o) => (o.kind === "measured" ? o.measurement.magnitude : undefined)).sort();
  assert.deepEqual(magnitudes, [0, 3600]);
});

// --- unknown metrics: real swim-specific vocabulary (SWOLF, strokes, calories) is unrecognized ------

test("044-C.4 real swim-specific metrics (swolf/total-strokes/calories) are accepted but flagged suspicious; running/cycling-shaped metrics (distance/duration/avg-pace/heart-rate) are recognized", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  const suspicious = measured.filter((o) => o.quality.status === "suspicious").map((o) => o.measurement.quantity);
  const complete = measured.filter((o) => o.quality.status === "complete").map((o) => o.measurement.quantity);

  // real finding: every swolf/total-strokes/calories entry is unrecognized (6 of them)
  assert.equal(suspicious.length, 6);
  assert.ok(suspicious.every((m) => ["swolf", "total-strokes", "calories"].includes(m)));

  // real finding: distance/duration/avg-pace/heart-rate ARE recognized (11 of them)
  assert.equal(complete.length, 11);
  assert.ok(complete.every((m) => ["distance", "duration", "avg-pace", "avg-heart-rate", "max-heart-rate"].includes(m)));
});

// --- provenance: sourceRowId / artifactRef / deviceLabel all survive into the real observations ------

test("044-C.5 sourceRowId, artifactRef, and deviceLabel are all preserved in Provenance.reference on real observations", () => {
  const { outcome } = runTrial();
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  const bySourceRow = (id: string) =>
    outcome.observationSet.observations.filter((o) => o.provenance.reference.includes(`row:${id}`));

  assert.ok(bySourceRow("csv-2").length > 0);
  assert.ok(bySourceRow("csv-59").length > 0);
  assert.ok(bySourceRow("csv-134").length > 0);

  // artifactRef (the real Garmin activity id) is on EVERY observation, not just some
  for (const o of outcome.observationSet.observations) {
    assert.ok(o.provenance.reference.includes("artifact:garmin-activity-23459651624"));
  }

  // deviceLabel was set on BOTH the csv-59 and csv-134 distance rows in the real fixture, but csv-59's
  // distance row is exactly the one that failed to parse (044-C.3) — so only csv-134's survives here.
  const withDevice = outcome.observationSet.observations.filter((o) =>
    o.provenance.reference.includes("device:Garmin Connect export"),
  );
  assert.equal(withDevice.length, 1);
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

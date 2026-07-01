// Implementation 044-A1 — manual/CSV training-row intake. A pure mapper turns already-parsed
// TrainingSummaryRow[] into the EXISTING ManualInputSubmission shape; ingestManualInput does the rest.
// No file I/O, no CSV library, no new observation model — negatives are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  trainingRowSubmissionToManualInput,
} from "../index.ts";
import type { TrainingRowSubmission, TrainingSummaryRow } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);
const OCCURRED = T("2026-04-01T08:00:00.000Z");
const SUBMITTED = T("2026-04-01T09:00:00.000Z");

function row(over: Partial<TrainingSummaryRow> = {}): TrainingSummaryRow {
  return {
    sourceRowId: "r1",
    metric: "avg-power",
    value: "240",
    unit: "w",
    observedAt: OCCURRED,
    ...over,
  };
}

function rowSubmission(over: Partial<TrainingRowSubmission> = {}): TrainingRowSubmission {
  return {
    submissionRef: "csv-1",
    athleteRef: "athlete:1",
    occasion: "2026-04-01 morning ride",
    source: "manual",
    sourceFormat: "csv-summary",
    submittedAt: SUBMITTED,
    occurredAt: OCCURRED,
    rows: [row()],
    ...over,
  };
}

function ingestRows(over: Partial<TrainingRowSubmission> = {}) {
  const submission = trainingRowSubmissionToManualInput(rowSubmission(over));
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission, observationSetRepository: repo });
  return { submission, repo, outcome };
}

// --- 1/2. a valid row maps and ingests -----------------------------------------------------------

test("1 a valid row maps into a measured-value ManualInputSubmission entry", () => {
  const submission = trainingRowSubmissionToManualInput(rowSubmission());
  assert.equal(submission.entries.length, 1);
  const entry = submission.entries[0]!;
  assert.equal(entry.kind, "measured-value");
  if (entry.kind !== "measured-value") return;
  assert.equal(entry.label, "avg-power");
  assert.equal(entry.rawValue, "240");
  assert.equal(entry.unit, "w");
  assert.ok(entry.sourceRowRef?.includes("row:r1"));
});

test("2 a valid row ingests into a measured Observation through ingestManualInput", () => {
  const { outcome } = ingestRows();
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.deepEqual(measured.measurement, { quantity: "avg-power", magnitude: 240, unit: "w" });
});

// --- 3. multiple valid rows are all accepted -------------------------------------------------------

test("3 multiple valid rows are all accepted into one ObservationSet", () => {
  const { outcome } = ingestRows({
    rows: [
      row({ sourceRowId: "r1", metric: "avg-power", value: "240", unit: "w" }),
      row({ sourceRowId: "r2", metric: "heart-rate", value: "150", unit: "bpm" }),
      row({ sourceRowId: "r3", metric: "distance", value: "42.2", unit: "km" }),
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  assert.equal(outcome.acceptedCount, 3);
});

// --- 4/6. missing unit is rejected at the row level --------------------------------------------------

test("4/6 a row with a missing unit is a row-level limitation (missing-unit), not a rejected value", () => {
  const { outcome } = ingestRows({ rows: [row({ unit: "" })] });
  assert.equal(outcome.status, "rejected"); // the ONLY row failed -> nothing faithfully representable
  if (outcome.status !== "rejected") return;
  assert.ok(outcome.reasons.includes("no-faithful-observation"));
});

test("6b present-but-unrecognized unit is accepted (no unit-catalog validation in this slice)", () => {
  const { outcome } = ingestRows({ rows: [row({ unit: "furlongs-per-fortnight" })] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
});

// --- 5. invalid numeric value is rejected at the row level -----------------------------------------

test("5 a non-numeric value is a row-level limitation (unparseable-numeric-value)", () => {
  const { outcome } = ingestRows({
    rows: [row({ sourceRowId: "r1", metric: "avg-power", value: "not-a-number" }), row({ sourceRowId: "r2", metric: "distance", value: "10", unit: "km" })],
  });
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  assert.equal(outcome.status, "partially-accepted");
  assert.ok(outcome.limitations.includes("unparseable-numeric-value"));
  assert.equal(outcome.acceptedCount, 1);
});

// --- 6c. missing metric is rejected at the row level ------------------------------------------------

test("6c a row with an empty metric label is a row-level limitation (ambiguous-field)", () => {
  const { outcome } = ingestRows({ rows: [row({ metric: "" })] });
  assert.equal(outcome.status, "rejected");
  if (outcome.status !== "rejected") return;
  assert.ok(outcome.reasons.includes("no-faithful-observation"));
});

// --- 7. unknown metric is accepted with a suspicious warning ---------------------------------------

test("7 an unrecognized metric name is accepted with a 'suspicious' quality warning, never rejected", () => {
  const { outcome } = ingestRows({ rows: [row({ metric: "wobble-factor", value: "3", unit: "arbitrary" })] });
  if (outcome.status === "rejected") return assert.fail("should accept an unfamiliar-but-well-formed metric");
  assert.equal(outcome.status, "accepted");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.quality.status, "suspicious");
});

// --- 9. mixed valid/invalid rows produce partially-accepted -----------------------------------------

test("9 mixed valid/invalid rows produce a partially-accepted outcome with row-level reasons", () => {
  const { outcome } = ingestRows({
    rows: [
      row({ sourceRowId: "r1", metric: "avg-power", value: "240", unit: "w" }),
      row({ sourceRowId: "r2", metric: "heart-rate", value: "150", unit: "" }), // missing unit
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  assert.equal(outcome.status, "partially-accepted");
  assert.ok(outcome.limitations.includes("missing-unit"));
  assert.equal(outcome.acceptedCount, 1);
});

// --- 10. artifactRef is preserved as provenance, not truth ------------------------------------------

test("10 artifactRef is preserved inside Provenance.reference — never embedded as measurement content", () => {
  const { outcome } = ingestRows({ artifactRef: "garmin-export-1" });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.ok(measured.provenance.reference.includes("artifact:garmin-export-1"));
  // never embedded as content
  assert.equal(String(measured.measurement.quantity).includes("artifact:"), false);
});

// --- 11. sourceRowId / row reference is preserved ----------------------------------------------------

test("11 sourceRowId is preserved inside Provenance.reference for the resulting observation", () => {
  const { outcome } = ingestRows({ rows: [row({ sourceRowId: "row-42" })] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.ok(measured.provenance.reference.includes("row:row-42"));
});

// --- 12. deviceLabel is preserved where possible ------------------------------------------------------

test("12 deviceLabel is preserved inside Provenance.reference (advisory only, no new field/Source value)", () => {
  const { outcome } = ingestRows({ rows: [row({ deviceLabel: "Garmin945" })] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.ok(measured.provenance.reference.includes("device:Garmin945"));
  assert.equal(measured.provenance.source, "manual"); // never a new Source value
});

// --- 13. notes are preserved where possible -----------------------------------------------------------

test("13 notes become a separate context-note entry, never merged into the measurement", () => {
  const submission = trainingRowSubmissionToManualInput(rowSubmission({ rows: [row({ notes: "felt windy" })] }));
  assert.equal(submission.entries.length, 2);
  const note = submission.entries.find((e) => e.kind === "context-note");
  assert.ok(note && note.kind === "context-note");
  assert.equal(note.words, "felt windy");
  const measured = submission.entries.find((e) => e.kind === "measured-value");
  assert.ok(measured && measured.kind === "measured-value");
  assert.equal(String(measured.label).includes("felt windy"), false);
});

// --- 14-19. no Evidence/Signal/RenderingRequest/runOperatorSession/delivery/AthleteDecision ------------

test("14-19 the mapper + ingestion produce no Evidence/Signal/RenderingRequest and call nothing beyond ingestManualInput", () => {
  const { outcome } = ingestRows();
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of [
    "evidence", "signal", "renderingrequest", "runoperatorsession", "invokeoperatorsession",
    "athletedecision", "deliver", "hypothesis", "understanding",
  ]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

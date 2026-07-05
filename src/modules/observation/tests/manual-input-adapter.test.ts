// Implementation 013 — Manual Input Adapter behavior (Spec 013 UC1-UC10). The adapter is a faithful
// scribe: it records source material as ObservationSet and never interprets it. Negatives are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ingestManualInput,
  InMemoryObservationSetRepository,
  observationQualityStatusFor,
} from "../index.ts";
import type { ManualInputEntry, ManualInputSubmission } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);
const OCCURRED = T("2026-03-01T08:00:00.000Z");
const SUBMITTED = T("2026-03-01T09:00:00.000Z");

function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-1",
    athleteRef: "athlete:1",
    submittedAt: SUBMITTED,
    occurredAt: OCCURRED,
    occasion: "2026-03-01 morning session",
    reporter: "athlete-report",
    entries: [{ kind: "subjective-report", words: "I felt heavy in today's session" }],
    ...over,
  };
}

function run(over: Partial<ManualInputSubmission> = {}) {
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission: submission(over), observationSetRepository: repo });
  return { repo, outcome };
}

// UC1 — accept a simple subjective session report --------------------------------------------------
test("UC1 — accepts a subjective report as an ObservationSet with provenance/source/quality", () => {
  const { outcome } = run();
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  const subj = outcome.observationSet.observations.find((o) => o.kind === "subjective");
  assert.ok(subj && subj.kind === "subjective");
  assert.equal(subj.provenance.source, "manual"); // AC4 — source is manual
  assert.ok(subj.quality.status.length > 0);
});

// UC5 — preserve raw wording verbatim -------------------------------------------------------------
test("UC5 — preserves the athlete's words verbatim (no summary)", () => {
  const { outcome } = run({ entries: [{ kind: "subjective-report", words: "legs like concrete, hated it" }] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const subj = outcome.observationSet.observations.find((o) => o.kind === "subjective");
  assert.ok(subj && subj.kind === "subjective");
  assert.equal(subj.words, "legs like concrete, hated it");
});

// UC6 — do not infer readiness/fatigue ------------------------------------------------------------
test("UC6 — 'I felt exhausted' becomes a subjective report, not a fatigue/readiness state", () => {
  const { outcome } = run({ entries: [{ kind: "subjective-report", words: "I felt exhausted" }] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of ["readiness", "fatigue", '"impact"', "capacity", "signal", "hypothesis", "evidence"]) {
    assert.ok(!json.includes(banned), `outcome must not contain '${banned}'`);
  }
});

// UC2 — accept missing data explicitly ------------------------------------------------------------
test("UC2 — records missing data explicitly rather than inventing a value", () => {
  const { outcome } = run({
    entries: [
      { kind: "subjective-report", words: "good session" },
      { kind: "missing-data", expected: "duration", reason: "forgot to start watch" },
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const md = outcome.observationSet.observations.find((o) => o.kind === "missing-data");
  assert.ok(md && md.kind === "missing-data");
  assert.equal(md.expected, "duration");
});

// UC3 — partial acceptance ------------------------------------------------------------------------
test("UC3 — a measured-value with no unit yields partially-accepted with a missing-unit limitation; faithful parts recorded", () => {
  const { outcome } = run({
    entries: [
      { kind: "subjective-report", words: "felt strong" },
      { kind: "measured-value", label: "avg power", rawValue: "240" }, // no unit — not faithfully representable
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  assert.equal(outcome.status, "partially-accepted");
  assert.ok(outcome.limitations.includes("missing-unit"));
  assert.equal(outcome.acceptedCount, 1);
});

test("UC3b — an empty-words subjective entry becomes an ambiguous-field limitation, not an inference", () => {
  const { outcome } = run({
    entries: [
      { kind: "subjective-report", words: "ok" },
      { kind: "subjective-report", words: "   " },
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should partially accept");
  assert.equal(outcome.status, "partially-accepted");
  assert.ok(outcome.limitations.includes("ambiguous-field"));
});

// UC4 — reject unrepresentable input --------------------------------------------------------------
test("UC4 — missing athlete ref is rejected and saves nothing", () => {
  const repo = new InMemoryObservationSetRepository();
  const outcome = ingestManualInput({ submission: submission({ athleteRef: "" }), observationSetRepository: repo });
  assert.equal(outcome.status, "rejected");
  assert.ok(outcome.reasons.includes("missing-athlete-ref"));
});

test("UC4b — an occurrence time after submission time is rejected as invalid-timestamp", () => {
  const { outcome } = run({ occurredAt: T("2026-03-02T00:00:00.000Z") }); // after submittedAt
  assert.equal(outcome.status, "rejected");
  assert.ok(outcome.reasons.includes("invalid-timestamp"));
});

test("UC4c — an empty submission is rejected", () => {
  const { outcome } = run({ entries: [] });
  assert.equal(outcome.status, "rejected");
  assert.ok(outcome.reasons.includes("empty-submission"));
});

test("UC4d — a measured entry smuggling an inferred state as fact is rejected", () => {
  const { outcome } = run({ entries: [{ kind: "measured-value", label: "readiness", rawValue: "high" }] });
  assert.equal(outcome.status, "rejected");
  assert.ok(outcome.reasons.includes("inference-smuggled-as-fact"));
});

test("UC4e — a measured-only submission with no faithfully representable entry is rejected", () => {
  const { outcome } = run({ entries: [{ kind: "measured-value", label: "avg power", rawValue: "not-a-number", unit: "w" }] });
  assert.equal(outcome.status, "rejected");
  assert.ok(outcome.reasons.includes("no-faithful-observation"));
});

test("UC4f — a valid measured-value submission is accepted as a MeasuredObservation", () => {
  const { outcome } = run({ entries: [{ kind: "measured-value", label: "avg power", rawValue: "240", unit: "w" }] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.deepEqual(measured.measurement, { quantity: "avg power", magnitude: 240, unit: "w" });
  assert.equal(measured.quality.status, "complete"); // "avg-power" is a recognized metric label
});

// Impl 044-C1A — RECOGNIZED_METRICS grew from 15 to 18 entries: swolf, total-strokes, calories -----------
test("044-C1A — swolf, total-strokes, and calories are now recognized (complete), each preserving its raw source label verbatim", () => {
  const { outcome } = run({
    entries: [
      { kind: "measured-value", label: "SWOLF", rawValue: "43", unit: "swolf" }, // uppercase source label
      { kind: "measured-value", label: "total-strokes", rawValue: "485", unit: "strokes" },
      { kind: "measured-value", label: "calories", rawValue: "179", unit: "kcal" },
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  const measured = outcome.observationSet.observations.filter((o) => o.kind === "measured");
  assert.equal(measured.length, 3);
  assert.ok(measured.every((o) => o.quality.status === "complete"));

  // raw label preservation: "SWOLF" (uppercase) is preserved VERBATIM in Measurement.quantity — recognition
  // normalizes only for the catalog lookup, never for what is stored.
  const swolf = measured.find((o) => o.kind === "measured" && o.measurement.quantity === "SWOLF");
  assert.ok(swolf, "the raw uppercase label 'SWOLF' must be preserved, not lowercased to 'swolf'");
});

test("044-C1A — an unrelated, still-unfamiliar metric remains accepted with a suspicious warning (the catalog stays closed)", () => {
  const { outcome } = run({ entries: [{ kind: "measured-value", label: "vo2max-estimate", rawValue: "52", unit: "ml/kg/min" }] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.equal(outcome.status, "accepted");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.quality.status, "suspicious");
});

// UC7 — athlete decision report is observation/context only, never a compliance score --------------
test("UC7 — an athlete-decision-report records a subjective observation, not an AthleteDecision/score", () => {
  const entry: ManualInputEntry = {
    kind: "athlete-decision-report",
    words: "I rode easy instead of the intervals",
    decisionSupportCaseRef: "case:1",
  };
  const { outcome } = run({ entries: [entry] });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const subj = outcome.observationSet.observations.find((o) => o.kind === "subjective");
  assert.ok(subj && subj.kind === "subjective");
  assert.equal(subj.words, "I rode easy instead of the intervals");
  const json = JSON.stringify(outcome).toLowerCase();
  for (const banned of ["compliance", "obedien", "correctness", "athletedecisionrecord", "supportquality"]) {
    assert.ok(!json.includes(banned), `outcome must not contain '${banned}'`);
  }
});

// UC9 — persistence goes through the repository port ----------------------------------------------
test("UC9 — accepted input is persisted through ObservationSetRepository", () => {
  const { repo, outcome } = run();
  if (outcome.status === "rejected") return assert.fail("should accept");
  assert.ok(repo.exists(outcome.observationSetId));
  assert.equal(String(repo.findById(outcome.observationSetId)?.id), String(outcome.observationSetId));
});

test("rejected input persists nothing (a throwing save is never reached)", () => {
  const real = new InMemoryObservationSetRepository();
  const throwingRepo = {
    save: (): void => {
      throw new Error("rejected ingestion must never call save()");
    },
    findById: real.findById.bind(real),
    exists: real.exists.bind(real),
  };
  assert.doesNotThrow(() =>
    ingestManualInput({ submission: submission({ athleteRef: "" }), observationSetRepository: throwingRepo }),
  );
});

// UC10 — no reasoning side effects ----------------------------------------------------------------
test("UC10 — ingestion produces only observations (no Signal/Evidence/Hypothesis/Understanding/DecisionSupport)", () => {
  const { outcome } = run({
    entries: [
      { kind: "subjective-report", words: "felt heavy" },
      { kind: "missing-data", expected: "intensity" },
    ],
  });
  if (outcome.status === "rejected") return assert.fail("should accept");
  for (const o of outcome.observationSet.observations) {
    assert.ok(["measured", "subjective", "missing-data"].includes(o.kind));
  }
  assert.equal(outcome.eventCandidate.type, "ObservationSetRecorded");
});

// quality mapping ---------------------------------------------------------------------------------
test("observationQualityStatusFor maps the input-quality summary onto existing ObservationQuality", () => {
  assert.equal(observationQualityStatusFor("complete"), "complete");
  assert.equal(observationQualityStatusFor("partial"), "partial");
  assert.equal(observationQualityStatusFor("conflicting"), "source-conflicted");
  assert.equal(observationQualityStatusFor("low-confidence"), "suspicious");
});

// --- Impl 044-C2A: grouped-thousands numeric lexical normalization (Spec 044-C2 / Tech Spec 044-C2A) ----
// parseFiniteNumber is private/unexported — every assertion below drives it only through the real
// measured-value intake path (mapEntry -> ingestManualInput), exactly like every other adapter test.

function measuredOutcome(rawValue: string, over: Partial<Extract<ManualInputEntry, { kind: "measured-value" }>> = {}) {
  return run({
    entries: [{ kind: "measured-value", label: "distance", rawValue, unit: "m", ...over }],
  }).outcome;
}

test("044-C2A.1 '1,600' normalizes to numeric 1600 (grouped-thousands, unambiguous)", () => {
  const outcome = measuredOutcome("1,600");
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.measurement.magnitude, 1600);
});

test("044-C2A.2 '12,345' normalizes to numeric 12345", () => {
  const outcome = measuredOutcome("12,345");
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.measurement.magnitude, 12345);
});

test("044-C2A.3 '1,234,567' normalizes to numeric 1234567 (multiple grouped-thousands groups)", () => {
  const outcome = measuredOutcome("1,234,567");
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.measurement.magnitude, 1234567);
});

test("044-C2A.4 '+1,600' and '-1,600' normalize per the signed grouped-thousands grammar", () => {
  const positive = measuredOutcome("+1,600");
  const negative = measuredOutcome("-1,600");
  if (positive.status === "rejected" || negative.status === "rejected") return assert.fail("should accept");
  const pos = positive.observationSet.observations.find((o) => o.kind === "measured");
  const neg = negative.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(pos && pos.kind === "measured" && neg && neg.kind === "measured");
  assert.equal(pos.measurement.magnitude, 1600);
  assert.equal(neg.measurement.magnitude, -1600);
});

test("044-C2A.5 ambiguous/malformed comma forms remain rejected as unparseable-numeric-value", () => {
  for (const ambiguous of ["1,6", "12,34", "1,23,456", "1.234,56", "1,600.5", "1,600,", ",600", "1, 600", "abc"]) {
    const outcome = measuredOutcome(ambiguous);
    assert.equal(outcome.status, "rejected", `expected '${ambiguous}' to be rejected`);
    assert.ok(outcome.reasons.includes("no-faithful-observation"), `expected '${ambiguous}' to yield no-faithful-observation`);
  }
});

test("044-C2A.6 existing plain integer, decimal-dot, signed, and zero behavior is unchanged", () => {
  for (const [rawValue, expected] of [
    ["240", 240],
    ["42.5", 42.5],
    ["-5", -5],
    ["0", 0],
  ] as const) {
    const outcome = measuredOutcome(rawValue);
    if (outcome.status === "rejected") return assert.fail(`'${rawValue}' should accept`);
    const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
    assert.ok(measured && measured.kind === "measured");
    assert.equal(measured.measurement.magnitude, expected);
  }
});

test("044-C2A.7 a normalized value keeps quality status complete for a recognized metric, with an honest additive reason note", () => {
  const outcome = measuredOutcome("1,600"); // "distance" is a recognized metric
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.quality.status, "complete");
  assert.ok(measured.quality.reason.includes("grouped-thousands"));
  for (const claim of ["locale", "device-accurate", "guaranteed", "device accuracy"]) {
    assert.ok(!measured.quality.reason.toLowerCase().includes(claim), `reason must not claim '${claim}'`);
  }
});

test("044-C2A.8 a normalized value for an UNRECOGNIZED metric stays suspicious (normalization never suppresses metric-recognition status)", () => {
  const outcome = measuredOutcome("1,600", { label: "vo2max-estimate" });
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.equal(measured.quality.status, "suspicious");
  assert.ok(measured.quality.reason.includes("grouped-thousands"));
  assert.ok(measured.quality.reason.includes("unrecognized metric name"));
});

test("044-C2A.9 the original raw text ('1,600') is preserved, recoverable, in Provenance.reference on the normalized path", () => {
  const outcome = measuredOutcome("1,600");
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.ok(measured.provenance.reference.includes('raw-numeric:"1,600"'));
});

test("044-C2A.10 an already-strict-parseable value ('240') gets no normalization note or raw-numeric provenance segment", () => {
  const outcome = measuredOutcome("240");
  if (outcome.status === "rejected") return assert.fail("should accept");
  const measured = outcome.observationSet.observations.find((o) => o.kind === "measured");
  assert.ok(measured && measured.kind === "measured");
  assert.ok(!measured.quality.reason.includes("normalized"));
  assert.ok(!measured.provenance.reference.includes("raw-numeric:"));
});

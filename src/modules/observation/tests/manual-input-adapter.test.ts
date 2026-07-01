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

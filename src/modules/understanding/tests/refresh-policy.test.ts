// Implementation 008 — the refresh policy is selective (only projections whose source refs intersect
// the trigger are affected), conservative under uncertainty, and never globally invalidates.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  currentFreshness,
  freshnessFromDecision,
  projectionRefreshPolicy,
  projectionSourceRef,
  projectionTrace,
  refreshTrigger,
} from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

const trace = projectionTrace([
  projectionSourceRef("understanding-profile", "profile-1"),
  projectionSourceRef("hypothesis", "hyp-1"),
  projectionSourceRef("observation-set", "set-1"),
  projectionSourceRef("observation", "obs-1"),
]);

test("purpose-change is selective: matching dimension stales, non-matching keeps current", () => {
  const hit = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "purpose-change", at: T("2026-03-01T00:00:00.000Z"), scope: { dimensionKey: "aerobic-response::high-intensity" } }),
    sourceRefs: trace,
    projectionDimensionKey: "aerobic-response::high-intensity",
  });
  assert.equal(hit.kind, "mark-stale");

  const miss = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "purpose-change", at: T("2026-03-01T00:00:00.000Z"), scope: { dimensionKey: "other::dim" } }),
    sourceRefs: trace,
    projectionDimensionKey: "aerobic-response::high-intensity",
  });
  assert.equal(miss.kind, "keep-current");
});

test("hypothesis-revised affects only projections that trace to that hypothesis", () => {
  const hit = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "hypothesis-revised", at: T("2026-03-01T00:00:00.000Z"), scope: { hypothesisId: "hyp-1" } }),
    sourceRefs: trace,
  });
  assert.equal(hit.kind, "mark-stale");

  const miss = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "hypothesis-revised", at: T("2026-03-01T00:00:00.000Z"), scope: { hypothesisId: "hyp-999" } }),
    sourceRefs: trace,
  });
  assert.equal(miss.kind, "keep-current");
});

test("hypothesis-falsified marks the dependent projection invalid", () => {
  const d = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "hypothesis-falsified", at: T("2026-03-01T00:00:00.000Z"), scope: { hypothesisId: "hyp-1" } }),
    sourceRefs: trace,
  });
  assert.equal(d.kind, "mark-invalid");
  assert.equal(freshnessFromDecision(d)?.status, "invalid");
});

test("observation-superseded affects only projections tracing to that observation", () => {
  const hit = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "observation-superseded", at: T("2026-03-01T00:00:00.000Z"), scope: { observationId: "obs-1" } }),
    sourceRefs: trace,
  });
  assert.equal(hit.kind, "mark-stale");

  const miss = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "observation-superseded", at: T("2026-03-01T00:00:00.000Z"), scope: { observationId: "obs-zzz" } }),
    sourceRefs: trace,
  });
  assert.equal(miss.kind, "keep-current");
});

test("source-quality-changed yields partial", () => {
  const d = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "source-quality-changed", at: T("2026-03-01T00:00:00.000Z"), scope: { observationId: "obs-1" } }),
    sourceRefs: trace,
  });
  assert.equal(d.kind, "mark-partial");
  assert.equal(freshnessFromDecision(d)?.status, "partial");
});

test("time-decay marks the evaluated projection stale", () => {
  const d = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "time-decay", at: T("2026-06-01T00:00:00.000Z") }),
    sourceRefs: trace,
  });
  assert.equal(d.kind, "mark-stale");
});

test("conservative under uncertainty: scoped trigger with no scope id does not keep-current", () => {
  const d = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "hypothesis-revised", at: T("2026-03-01T00:00:00.000Z") }), // no hypothesisId
    sourceRefs: trace,
  });
  assert.notEqual(d.kind, "keep-current");
  assert.equal(d.kind, "mark-stale");
});

test("missing-source unavailable -> invalid; a missing-source quality issue -> partial", () => {
  const unavailable = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "projection-source-unavailable", at: T("2026-03-01T00:00:00.000Z"), scope: { observationId: "obs-1" } }),
    sourceRefs: trace,
  });
  assert.equal(unavailable.kind, "mark-invalid");

  const missing = projectionRefreshPolicy({
    freshness: currentFreshness(),
    trigger: refreshTrigger({ kind: "missing-source", at: T("2026-03-01T00:00:00.000Z"), scope: { observationId: "obs-1" } }),
    sourceRefs: trace,
  });
  assert.equal(missing.kind, "mark-partial");
});

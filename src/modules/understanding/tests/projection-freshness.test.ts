// Implementation 008 — UnderstandingAssessment exposes freshness; non-current freshness can only
// LOWER the ceiling (invalid/unknown -> none). Refresh recomputes; it never mutates an old view.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  UnderstandingProfile,
  applyFreshness,
  clampCeilingByFreshness,
  currentFreshness,
  projectionFreshness,
  reasoningOutcome,
  understandingDimension,
} from "../index.ts";
import type { HypothesisId } from "../../reasoning/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);
const DIM = understandingDimension("aerobic-response", "high-intensity");

function workingProfile(): UnderstandingProfile {
  return UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
    reasoningOutcome({
      hypothesisId: "hyp-1" as unknown as HypothesisId,
      athleteRef: "athlete:1",
      outcomeKind: "supported",
      hadDeclaredFalsifier: true,
      conditions: ["high-intensity ride"],
      dimension: DIM,
      at: T("2026-01-02T09:05:00.000Z"),
    }),
  );
}

test("a fresh assessment exposes freshness=current, source refs, and derived-at", () => {
  const a = workingProfile().assess(DIM.key, T("2026-01-02T10:00:00.000Z"));
  assert.ok(a);
  assert.equal(a.freshness?.status, "current");
  assert.equal(a.safeVoiceCeiling, "tentative"); // Working -> tentative, unchanged by current freshness
  assert.equal(a.derivedAt?.iso, "2026-01-02T10:00:00.000Z");
  assert.ok(a.sourceRefs && a.sourceRefs.refs.length >= 2); // profile + hypothesis
  assert.ok(a.sourceRefs?.refs.some((r) => r.kind === "hypothesis"));
  assert.ok(a.sourceRefs?.refs.some((r) => r.kind === "understanding-profile"));
});

test("source refs reference real artifacts; the projection invents no traceability", () => {
  const a = workingProfile().assess(DIM.key);
  assert.ok(a);
  // every hypothesis ref corresponds to a trace outcome (no fabricated refs)
  const traceIds = new Set(a.trace.map((t) => String(t.hypothesisId)));
  for (const r of a.sourceRefs?.refs ?? []) {
    if (r.kind === "hypothesis") {
      assert.ok(traceIds.has(r.id), `hypothesis ref ${r.id} must come from the trace`);
    }
  }
});

test("clampCeilingByFreshness: current keeps, stale/partial lower, invalid/unknown -> none", () => {
  assert.equal(clampCeilingByFreshness("confident", currentFreshness()), "confident");
  assert.equal(clampCeilingByFreshness("confident", projectionFreshness("stale", ["time-decay"])), "qualified");
  assert.equal(clampCeilingByFreshness("confident", projectionFreshness("partial", ["source-quality-changed"])), "qualified");
  assert.equal(clampCeilingByFreshness("confident", projectionFreshness("invalid", ["hypothesis-falsified"])), "none");
  assert.equal(clampCeilingByFreshness("confident", projectionFreshness("unknown", ["missing-source"])), "none");
});

test("no non-current freshness can RAISE the ceiling", () => {
  const a = workingProfile().assess(DIM.key); // tentative
  assert.ok(a);
  for (const f of [
    projectionFreshness("stale", ["time-decay"]),
    projectionFreshness("partial", ["source-quality-changed"]),
    projectionFreshness("invalid", ["hypothesis-falsified"]),
    projectionFreshness("unknown", ["projection-source-unavailable"]),
  ]) {
    const constrained = applyFreshness(a, f);
    // tentative is the base; none of these may exceed it
    const order = ["none", "tentative", "qualified", "confident"];
    assert.ok(order.indexOf(constrained.safeVoiceCeiling) <= order.indexOf(a.safeVoiceCeiling));
  }
});

test("applyFreshness produces a NEW assessment and never mutates the old one", () => {
  const a = workingProfile().assess(DIM.key);
  assert.ok(a);
  const before = a.safeVoiceCeiling;
  const invalid = applyFreshness(a, projectionFreshness("invalid", ["hypothesis-falsified"]));
  assert.equal(invalid.safeVoiceCeiling, "none");
  assert.notEqual(invalid, a);
  // the old assessment is untouched and still auditable
  assert.equal(a.safeVoiceCeiling, before);
  assert.equal(a.freshness?.status, "current");
  // the constrained view records an auditable freshness reason
  assert.ok(invalid.reasons.some((r) => r.includes("freshness invalid")));
});

test("partial freshness constrains voice (one step down from the fresh base)", () => {
  const a = workingProfile().assess(DIM.key); // tentative
  assert.ok(a);
  const partial = applyFreshness(a, projectionFreshness("partial", ["missing-source"]));
  assert.equal(partial.safeVoiceCeiling, "none"); // tentative -> none (one step)
  assert.equal(partial.freshness?.status, "partial");
});

test("stale assessment lowering matches the legacy path (no double-count)", () => {
  // mark the dimension stale via the existing path, then assess
  const stale = workingProfile().markStale(DIM.key, "staleness", T("2026-02-01T00:00:00.000Z"));
  const a = stale.assess(DIM.key);
  assert.ok(a);
  assert.equal(a.freshness?.status, "stale");
  // Working base = tentative; stale lowers once -> none (not double-lowered)
  assert.equal(a.safeVoiceCeiling, "none");
});

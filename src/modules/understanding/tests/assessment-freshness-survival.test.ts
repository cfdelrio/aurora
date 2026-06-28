// Implementation 010 — UC7: projection freshness survives in-memory storage (test helper only).
// There is NO projection repository; this proves a stored UnderstandingAssessment stays a labeled
// view (derivedAt/freshness/sourceRefs/limitations survive) and never loads as source truth.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  UnderstandingProfile,
  applyFreshness,
  projectionFreshness,
  reasoningOutcome,
  understandingDimension,
} from "../index.ts";
import type { UnderstandingAssessment } from "../index.ts";
import type { HypothesisId } from "../../reasoning/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);
const DIM = understandingDimension("aerobic-response", "high-intensity");

// A minimal in-memory store for projections, defined inline -- NOT a production projection repository.
class InMemoryAssessmentStore {
  private readonly store = new Map<string, UnderstandingAssessment>();
  put(key: string, a: UnderstandingAssessment): void {
    this.store.set(key, structuredClone(a));
  }
  get(key: string): UnderstandingAssessment | undefined {
    const a = this.store.get(key);
    return a === undefined ? undefined : structuredClone(a);
  }
}

function assessment(): UnderstandingAssessment {
  const profile = UnderstandingProfile.initialize({ athleteRef: "athlete:1" }).updateFromOutcome(
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
  const a = profile.assess(DIM.key, T("2026-01-02T10:00:00.000Z"));
  assert.ok(a);
  return a;
}

test("a stored assessment keeps derivedAt, freshness, sourceRefs, and limitations", () => {
  const store = new InMemoryAssessmentStore();
  const a = assessment();
  store.put(DIM.key, a);
  const loaded = store.get(DIM.key);
  assert.ok(loaded);
  assert.equal(loaded.derivedAt?.iso, a.derivedAt?.iso);
  assert.equal(loaded.freshness?.status, "current");
  assert.ok(loaded.sourceRefs && loaded.sourceRefs.refs.length >= 1);
  assert.ok(loaded.limitations);
});

test("a stored NON-current assessment loads still constrained -- never as source truth", () => {
  const store = new InMemoryAssessmentStore();
  const invalid = applyFreshness(assessment(), projectionFreshness("invalid", ["hypothesis-falsified"]));
  store.put(DIM.key, invalid);
  const loaded = store.get(DIM.key);
  assert.ok(loaded);
  assert.equal(loaded.freshness?.status, "invalid");
  assert.equal(loaded.safeVoiceCeiling, "none"); // invalid -> ceiling none survives storage
});

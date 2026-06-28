// Implementation 010 — UnderstandingProfile round-trip: dimension state + staleness survive, and a
// rehydrated profile produces an equivalent assessment (promotion is NOT re-run on load).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryUnderstandingProfileRepository,
  UnderstandingProfile,
  reasoningOutcome,
  understandingDimension,
} from "../index.ts";
import type { UnderstandingProfileState } from "../index.ts";
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

test("UnderstandingProfile round-trips: dimension level + ceiling survive; assessment is equivalent", () => {
  const repo = new InMemoryUnderstandingProfileRepository();
  const profile = workingProfile();
  const before = profile.assess(DIM.key);
  assert.ok(before);
  repo.save(profile);

  const loaded = repo.findById(profile.id);
  assert.ok(loaded);
  assert.equal(loaded.levelOf(DIM.key), "Working");
  const after = loaded.assess(DIM.key);
  assert.ok(after);
  assert.equal(after.level, before.level);
  assert.equal(after.safeVoiceCeiling, before.safeVoiceCeiling);
  assert.equal(after.freshness?.status, before.freshness?.status);
});

test("stale dimension survives the round-trip (ceiling stays lowered)", () => {
  const repo = new InMemoryUnderstandingProfileRepository();
  const stale = workingProfile().markStale(DIM.key, "staleness", T("2026-03-01T00:00:00.000Z"));
  repo.save(stale);
  const loaded = repo.findById(stale.id);
  assert.ok(loaded);
  const a = loaded.assess(DIM.key);
  assert.ok(a);
  assert.equal(a.freshness?.status, "stale");
  assert.equal(a.safeVoiceCeiling, "none"); // Working -> tentative, lowered once by stale -> none
});

test("mutation isolation: two finds are independent", () => {
  const repo = new InMemoryUnderstandingProfileRepository();
  const profile = workingProfile();
  repo.save(profile);
  const a = repo.findById(profile.id);
  const b = repo.findById(profile.id);
  assert.ok(a && b);
  assert.notEqual(a, b);
});

test("reconstitute rejects invalid state (no athleteRef)", () => {
  const bad = { id: "x", athleteRef: "", dimensions: [] } as unknown as UnderstandingProfileState;
  assert.throws(() => UnderstandingProfile.reconstitute(bad));
});

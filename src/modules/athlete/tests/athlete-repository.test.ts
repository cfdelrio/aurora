// Implementation 010 — Athlete round-trip: PurposeHistory append-only + current-from-latest survive;
// persisted state carries only the *given* (no inferred state/capacity/readiness).

import { test } from "node:test";
import assert from "node:assert/strict";

import { Athlete, InMemoryAthleteRepository, purpose } from "../index.ts";
import type { AthleteState } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function athleteWithTwoPurposes(): Athlete {
  return Athlete.create({ identityRef: "athlete:1" })
    .declarePurpose(purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }))
    .changePurpose(
      purpose({ statement: "recover from injury", source: "athlete-declared", effectiveAt: T("2026-03-01T00:00:00.000Z") }),
      "injury",
    );
}

test("Athlete round-trips: purpose history append-only, current derives from latest version", () => {
  const repo = new InMemoryAthleteRepository();
  const athlete = athleteWithTwoPurposes();
  repo.save(athlete);

  const loaded = repo.findById(athlete.id);
  assert.ok(loaded);
  assert.equal(loaded.purposeHistory().length, 2);
  assert.equal(loaded.currentPurpose()?.statement, "recover from injury");
  assert.equal(loaded.currentVersion()?.version, 2);
  // the first version remains auditable
  assert.equal(loaded.purposeHistory()[0]?.purpose.statement, "race prep");
});

test("persisted Athlete state carries only the given (no inferred state/capacity/readiness)", () => {
  const athlete = athleteWithTwoPurposes();
  const state = athlete.toState() as unknown as Record<string, unknown>;
  for (const k of ["currentState", "capacity", "capacityProfile", "readiness", "fatigue", "understanding"]) {
    assert.equal(state[k], undefined, `persisted Athlete must not carry '${k}'`);
  }
});

test("mutation isolation + reconstitute rejects invalid state", () => {
  const repo = new InMemoryAthleteRepository();
  const athlete = athleteWithTwoPurposes();
  repo.save(athlete);
  const a = repo.findById(athlete.id);
  const b = repo.findById(athlete.id);
  assert.ok(a && b);
  assert.notEqual(a, b);

  // out-of-order / non-contiguous history is rejected
  const bad = { ...athlete.toState(), history: athlete.toState().history.slice(1) } as unknown as AthleteState;
  assert.throws(() => Athlete.reconstitute(bad));
});

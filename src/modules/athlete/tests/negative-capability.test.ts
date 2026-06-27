// Implementation 007 — DEFINING NEGATIVE TESTS: Athlete owns the *given* (declared purpose) and
// never the *inferred*. No state, capacity, readiness, fatigue, or performance profile exists here.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as athleteModule from "../index.ts";
import { Athlete, ambiguousPurpose, purpose } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

test("the athlete module surface exposes no inferred-state / capacity / readiness symbol", () => {
  const forbidden = /readiness|capacity|fatigue|currentstate|performanceprofile|recommend|voice|understandinglevel/i;
  for (const name of Object.keys(athleteModule)) {
    assert.equal(forbidden.test(name), false, `must not export '${name}'`);
  }
});

test("a Purpose value carries no inferred fields", () => {
  const p = purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") });
  const bag = p as unknown as Record<string, unknown>;
  for (const k of ["readiness", "capacity", "fatigue", "currentState", "level", "voice"]) {
    assert.equal(bag[k], undefined, `Purpose must not carry '${k}'`);
  }
});

test("an Athlete carries no inferred state/capacity; only the given purpose history", () => {
  const a = Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    purpose({ statement: "race prep", source: "athlete-declared", effectiveAt: T("2026-01-01T00:00:00.000Z") }),
  );
  const bag = a as unknown as Record<string, unknown>;
  for (const k of ["readiness", "capacity", "fatigue", "currentState", "capacityProfile", "understanding"]) {
    assert.equal(bag[k], undefined, `Athlete must not own '${k}'`);
  }
});

test("an ambiguous purpose is first-class and athlete-sourced (not a guess Aurora made)", () => {
  const a = Athlete.create({ identityRef: "athlete:1" }).declarePurpose(
    ambiguousPurpose({
      source: "athlete-accepted",
      effectiveAt: T("2026-01-01T00:00:00.000Z"),
      ambiguityNote: "unsure between gravel and road this season",
    }),
  );
  assert.equal(a.currentPurpose()?.status, "ambiguous");
  assert.equal(a.currentPurposeView().status, "ambiguous");
});

test("a missing purpose (no declaration) reads as unknown, not a guess", () => {
  const a = Athlete.create({ identityRef: "athlete:1" });
  assert.equal(a.currentPurpose(), undefined);
  assert.equal(a.currentPurposeView().status, "unknown");
});

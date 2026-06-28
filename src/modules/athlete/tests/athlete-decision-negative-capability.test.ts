// Implementation 009 — DEFINING NEGATIVE TESTS: the decision is athlete-owned learning material,
// never obedience tracking. No compliance/obedience/noncompliance/shame/reward/correctness field
// exists; following != success and not-following != failure are unrepresentable as scores.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as athleteModule from "../index.ts";
import {
  athleteDecision,
  decisionChoice,
  decisionRationale,
} from "../index.ts";
import type { DecisionReportSource } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function decisionFollowing() {
  return athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "did exactly what the framing suggested" }),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
    divergedFromSupport: false,
  });
}

function decisionNotFollowing() {
  return athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "chose to rest instead" }),
    rationale: decisionRationale(["disagreed with Aurora"]),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
    divergedFromSupport: true,
  });
}

test("an AthleteDecision carries no compliance/obedience/score/shame/reward/correctness field", () => {
  const forbidden = ["complianceScore", "obedience", "obedienceScore", "noncompliance", "shame", "reward", "correct", "score", "grade"];
  for (const d of [decisionFollowing(), decisionNotFollowing()]) {
    const bag = d as unknown as Record<string, unknown>;
    for (const k of forbidden) {
      assert.equal(bag[k], undefined, `AthleteDecision must not carry '${k}'`);
    }
  }
});

test("following Aurora produces no obedience-success marker; not-following produces no failure marker", () => {
  const followed = decisionFollowing();
  const notFollowed = decisionNotFollowing();
  // both are just decisions with a neutral divergence fact -- no success/failure valence anywhere
  assert.equal(followed.divergedFromSupport, false);
  assert.equal(notFollowed.divergedFromSupport, true);
  const fb = followed as unknown as Record<string, unknown>;
  const nb = notFollowed as unknown as Record<string, unknown>;
  assert.equal(fb["success"], undefined);
  assert.equal(nb["failure"], undefined);
  assert.equal(nb["penalty"], undefined);
});

test("rationale is preserved as athlete context (including disagreement), never a shame marker", () => {
  const d = decisionNotFollowing();
  assert.deepEqual([...d.rationale.statements], ["disagreed with Aurora"]);
});

test("the athlete module surface exposes no compliance/obedience/scoring symbol", () => {
  const forbidden = /compliance|obedience|noncompliance|shame|reward|penalt/i;
  for (const name of Object.keys(athleteModule)) {
    assert.equal(forbidden.test(name), false, `must not export '${name}'`);
  }
});

test("an AthleteDecision requires an athlete source (no inferred/system decisions)", () => {
  assert.throws(() =>
    athleteDecision({
      athleteRef: "athlete:1",
      choice: decisionChoice({ action: "x" }),
      source: "inferred" as unknown as DecisionReportSource,
      at: T("2026-01-03T18:00:00.000Z"),
    }),
  );
});

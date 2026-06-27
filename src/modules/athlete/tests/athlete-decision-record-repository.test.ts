// Implementation 010 — AthleteDecisionRecord round-trip: append-only history, amendments/supersession,
// and active-decision derivation survive; no obedience/compliance/score field is persisted.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AthleteDecisionRecord,
  InMemoryAthleteDecisionRecordRepository,
  athleteDecision,
  athleteDecisionAmendment,
  decisionChoice,
  decisionRationale,
} from "../index.ts";
import type { AthleteDecisionRecordState } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function recordWithAmendment(): AthleteDecisionRecord {
  const original = athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "rode easy instead of intervals" }),
    rationale: decisionRationale(["legs heavy"]),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
    divergedFromSupport: true,
  });
  const corrected = athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "actually did the full session" }),
    source: "athlete-reported",
    at: T("2026-01-03T20:00:00.000Z"),
  });
  return AthleteDecisionRecord.empty("athlete:1")
    .record(original)
    .amend(athleteDecisionAmendment(original.id, corrected, "misremembered", T("2026-01-03T20:00:00.000Z")));
}

test("AthleteDecisionRecord round-trips: history append-only, supersession + active derivation survive", () => {
  const repo = new InMemoryAthleteDecisionRecordRepository();
  const record = recordWithAmendment();
  repo.save(record);

  const loaded = repo.findByAthleteRef("athlete:1");
  assert.ok(loaded);
  assert.equal(loaded.decisions.length, 2); // original retained + correction
  assert.equal(loaded.amendments.length, 1);
  assert.equal(loaded.supersededIds().length, 1);
  assert.equal(loaded.active().length, 1);
  assert.equal(loaded.active()[0]?.choice.action, "actually did the full session");
  // divergence is preserved as neutral fact; no score field exists
  const first = loaded.decisions[0] as unknown as Record<string, unknown>;
  assert.equal(first["divergedFromSupport"], true);
  for (const k of ["complianceScore", "obedience", "shame", "reward", "score"]) {
    assert.equal(first[k], undefined, `persisted decision must not carry '${k}'`);
  }
});

test("mutation isolation + reconstitute rejects an amendment referencing an unknown decision", () => {
  const repo = new InMemoryAthleteDecisionRecordRepository();
  const record = recordWithAmendment();
  repo.save(record);
  const a = repo.findByAthleteRef("athlete:1");
  const b = repo.findByAthleteRef("athlete:1");
  assert.ok(a && b);
  assert.notEqual(a, b);

  // an amendment whose supersedesId is not among the decisions is rejected
  const bad = { ...record.toState(), decisions: [] } as unknown as AthleteDecisionRecordState;
  assert.throws(() => AthleteDecisionRecord.reconstitute(bad));
});

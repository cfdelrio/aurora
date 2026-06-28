// Implementation 009 — AthleteDecision is athlete-owned, append-only; corrections amend/supersede,
// never overwrite; modifications and divergence are first-class facts, not scores.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AthleteDecisionRecord,
  athleteDecision,
  athleteDecisionAmendment,
  athleteDecisionRefOf,
  decisionChoice,
  decisionContext,
  decisionOutcomeRef,
  decisionRationale,
} from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function aDecision() {
  return athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "rode easy instead of the prescribed intervals" }),
    rationale: decisionRationale(["legs felt heavy", "disagreed with pushing today"]),
    context: decisionContext({ decisionSupportCaseRef: "case-1", purposeVersionRef: "pv-1" }),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
    divergedFromSupport: true,
  });
}

test("an AthleteDecision is athlete-owned and preserves the chosen action + rationale", () => {
  const d = aDecision();
  assert.equal(d.athleteRef, "athlete:1");
  assert.equal(d.choice.action, "rode easy instead of the prescribed intervals");
  assert.deepEqual([...d.rationale.statements], ["legs felt heavy", "disagreed with pushing today"]);
  assert.equal(d.context.decisionSupportCaseRef, "case-1");
});

test("a modified choice is first-class (free text), not a binary compliance flag", () => {
  const d = athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({
      action: "did the intervals",
      modification: "but only 3 of 5, then stopped",
      alternatives: ["full session", "full rest"],
    }),
    source: "athlete-reported",
    at: T("2026-01-03T18:00:00.000Z"),
  });
  assert.equal(d.choice.modification, "but only 3 of 5, then stopped");
  const bag = d.choice as unknown as Record<string, unknown>;
  assert.equal(bag["followed"], undefined);
  assert.equal(bag["compliant"], undefined);
});

test("divergence from support is neutral factual metadata, not a score", () => {
  const d = aDecision();
  assert.equal(d.divergedFromSupport, true);
  // it is a plain boolean fact, carrying no valence/score fields
  assert.equal(typeof d.divergedFromSupport, "boolean");
});

test("the record is append-only; a correction amends/supersedes and keeps the original", () => {
  const original = aDecision();
  let record = AthleteDecisionRecord.empty("athlete:1").record(original);
  assert.equal(record.decisions.length, 1);

  const corrected = athleteDecision({
    athleteRef: "athlete:1",
    choice: decisionChoice({ action: "actually I did the full session after a warmup" }),
    source: "athlete-reported",
    at: T("2026-01-03T20:00:00.000Z"),
  });
  record = record.amend(athleteDecisionAmendment(original.id, corrected, "misremembered earlier", T("2026-01-03T20:00:00.000Z")));

  // original retained in history; both present
  assert.equal(record.decisions.length, 2);
  assert.ok(record.byId(original.id), "original remains auditable");
  // original is superseded, not deleted
  assert.deepEqual([...record.supersededIds()], [original.id]);
  assert.equal(record.active().length, 1);
  assert.equal(record.active()[0]?.id, corrected.id);
});

test("a DecisionOutcomeRef is separate from the decision; 'no outcome' is the default", () => {
  const d = aDecision();
  assert.deepEqual([...d.outcomeRefs], []); // no outcome by default
  // outcome arrives later, separately, as a reference (not embedded in the decision at record time)
  const ref = decisionOutcomeRef("obs-outcome-1", T("2026-01-05T08:00:00.000Z"));
  assert.equal(ref.outcomeObservationRef, "obs-outcome-1");
});

test("an athlete-local AthleteDecisionRef is shape-compatible (decisionId/at/divergedFromSupport)", () => {
  const d = aDecision();
  const ref = athleteDecisionRefOf(d);
  assert.equal(ref.decisionId, String(d.id));
  assert.equal(ref.divergedFromSupport, true);
  assert.ok(ref.at);
});

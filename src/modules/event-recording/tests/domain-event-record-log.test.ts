// Implementation 011 — DomainEventRecordLog: append-only, order-preserving, duplicate-id rejecting,
// correlation grouping, correction-as-new-record, and validated round-trip.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DomainEventRecord, DomainEventRecordLog, correlationRef, domainEventRecordId } from "../index.ts";
import { observationSetRecorded, OCCURRED, RECORDED } from "./fixtures.ts";

function decisionAmended(id: string, role: "amends" | "subject"): DomainEventRecord {
  return DomainEventRecord.record({
    id: domainEventRecordId(id),
    type: role === "amends" ? "AthleteDecisionAmended" : "AthleteDecisionRecorded",
    category: "outcome",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "athlete",
    traceability: {
      primaryArtifactRef: { kind: "AthleteDecision", id: `dec:${id}` },
      sourceRefs: role === "amends" ? [{ kind: "AthleteDecision", id: "dec:original", role: "amends" }] : [],
    },
    actor: { kind: "athlete", athleteRef: "athlete:1" },
  });
}

// AC9 — append preserves order --------------------------------------------------------------------
test("append preserves append order and is immutable-by-operation", () => {
  const a = observationSetRecorded({ id: domainEventRecordId("a") });
  const b = observationSetRecorded({ id: domainEventRecordId("b") });
  const empty = DomainEventRecordLog.empty();
  const one = empty.append(a);
  const two = one.append(b);
  assert.equal(empty.all().length, 0); // original unchanged
  assert.deepEqual(two.all().map((r) => String(r.id)), ["a", "b"]);
});

// AC10 — duplicate id rejected --------------------------------------------------------------------
test("appending a duplicate record id is rejected", () => {
  const a = observationSetRecorded({ id: domainEventRecordId("dup") });
  const log = DomainEventRecordLog.empty().append(a);
  assert.throws(() => log.append(observationSetRecorded({ id: domainEventRecordId("dup") })), /append-only/);
});

test("findById returns the appended record", () => {
  const a = observationSetRecorded({ id: domainEventRecordId("find-me") });
  const log = DomainEventRecordLog.empty().append(a);
  assert.equal(String(log.findById(domainEventRecordId("find-me"))?.id), "find-me");
  assert.equal(log.findById(domainEventRecordId("missing")), undefined);
});

// UC6 — correlation groups records without ordering authority --------------------------------------
test("findByCorrelation groups records of the same flow", () => {
  const flow = correlationRef("flow-7");
  const a = observationSetRecorded({ id: domainEventRecordId("c1"), correlation: flow });
  const b = observationSetRecorded({ id: domainEventRecordId("c2"), correlation: flow });
  const c = observationSetRecorded({ id: domainEventRecordId("c3") }); // no correlation
  const log = DomainEventRecordLog.empty().append(a).append(b).append(c);
  assert.deepEqual(log.findByCorrelation(flow).map((r) => String(r.id)), ["c1", "c2"]);
});

// UC8 — correction/supersession appends a NEW record; original retained ----------------------------
test("a correction appends a new record and leaves the original present", () => {
  const original = decisionAmended("orig", "subject");
  const amendment = decisionAmended("amend", "amends");
  const log = DomainEventRecordLog.empty().append(original).append(amendment);
  assert.equal(log.all().length, 2);
  assert.equal(String(log.findById(domainEventRecordId("orig"))?.id), "orig");
  assert.equal(String(log.findById(domainEventRecordId("amend"))?.id), "amend");
});

// round-trip ---------------------------------------------------------------------------------------
test("log toState/reconstitute round-trips and re-validates", () => {
  const log = DomainEventRecordLog.empty()
    .append(observationSetRecorded({ id: domainEventRecordId("r1") }))
    .append(observationSetRecorded({ id: domainEventRecordId("r2") }));
  const back = DomainEventRecordLog.reconstitute(structuredClone(log.toState()));
  assert.deepEqual(back.all().map((r) => String(r.id)), ["r1", "r2"]);
});

test("log reconstitute rejects duplicate ids in stored state", () => {
  const one = observationSetRecorded({ id: domainEventRecordId("x") }).toState();
  assert.throws(
    () => DomainEventRecordLog.reconstitute({ records: [one, one] }),
    /duplicate record ids/,
  );
});

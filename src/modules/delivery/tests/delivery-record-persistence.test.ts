// Implementation 016 — DeliveryRecord persistence: repository port round-trip, findByRenderedMessageRecordRef,
// mutation isolation, and validated reconstitution (invalid state rejected).

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderedMessageRecordId } from "../../rendering/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

import {
  DeliveryRecord,
  InMemoryDeliveryRecordRepository,
  deliveryRecordId,
  deliveryRequest,
  newDeliveryRequestId,
} from "../index.ts";
import type { DeliveryEligibilityCheck, DeliveryRecordState, DeliveryTarget } from "../index.ts";

const NOW = timestamp("2026-03-01T12:00:00.000Z");

function eligibility(ref: string, eligible: boolean): DeliveryEligibilityCheck {
  const reasons = eligible ? [] : ["review-status:not-reviewed"];
  return Object.freeze({
    renderedMessageRecordRef: renderedMessageRecordId(ref),
    eligible,
    eligibility: Object.freeze({
      eligible,
      reasons: Object.freeze([...reasons]),
      recordRef: renderedMessageRecordId(ref),
      currentReviewStatus: eligible ? ("approved-for-display" as const) : ("not-reviewed" as const),
    }),
    reasons: Object.freeze([...reasons]),
    checkedAt: NOW,
  });
}

function deliveredState(id = "del-1", ref = "rec-1", target: DeliveryTarget = "test-sink"): DeliveryRecordState {
  return {
    id: deliveryRecordId(id),
    renderedMessageRecordRef: renderedMessageRecordId(ref),
    target,
    request: deliveryRequest({
      id: newDeliveryRequestId(),
      renderedMessageRecordRef: renderedMessageRecordId(ref),
      target,
      requestedAt: NOW,
      requesterKind: "system",
    }),
    eligibility: eligibility(ref, true),
    outcome: "delivered",
    sinkKind: "test-sink",
    requestedAt: NOW,
    attemptedAt: NOW,
    completedAt: NOW,
  };
}

test("repository persists and rehydrates a delivery record", () => {
  const repo = new InMemoryDeliveryRecordRepository();
  const record = DeliveryRecord.create(deliveredState("del-1", "rec-1"));
  repo.save(record);
  assert.ok(repo.exists(deliveryRecordId("del-1")));
  const loaded = repo.findById(deliveryRecordId("del-1"));
  assert.ok(loaded !== undefined);
  assert.equal(loaded.outcome, "delivered");
  assert.equal(String(loaded.renderedMessageRecordRef), "rec-1");
});

test("findByRenderedMessageRecordRef returns matching records", () => {
  const repo = new InMemoryDeliveryRecordRepository();
  repo.save(DeliveryRecord.create(deliveredState("del-1", "rec-1")));
  repo.save(DeliveryRecord.create(deliveredState("del-2", "rec-1")));
  repo.save(DeliveryRecord.create(deliveredState("del-3", "rec-2")));
  assert.equal(repo.findByRenderedMessageRecordRef(renderedMessageRecordId("rec-1")).length, 2);
  assert.equal(repo.findByRenderedMessageRecordRef(renderedMessageRecordId("rec-2")).length, 1);
});

test("repository mutation isolation: two finds are independent and do not affect the store", () => {
  const repo = new InMemoryDeliveryRecordRepository();
  repo.save(DeliveryRecord.create(deliveredState("del-1", "rec-1")));
  const a = repo.findById(deliveryRecordId("del-1"));
  const b = repo.findById(deliveryRecordId("del-1"));
  assert.ok(a !== undefined && b !== undefined);
  assert.notEqual(a, b); // distinct instances
  // mutating a returned record's state object does not bleed into the store
  const mutated = a.toState() as { reasons?: unknown };
  // toState() is frozen; attempting to mutate throws or is ignored — the store stays intact
  try {
    (a.eligibility.reasons as string[]).push("tampered");
  } catch {
    /* frozen — expected */
  }
  const c = repo.findById(deliveryRecordId("del-1"));
  assert.ok(c !== undefined);
  assert.equal(c.eligibility.reasons.includes("tampered"), false);
  assert.ok(mutated !== undefined);
});

test("reconstitute round-trips a delivered record", () => {
  const record = DeliveryRecord.create(deliveredState("del-1", "rec-1"));
  const back = DeliveryRecord.reconstitute(structuredClone(record.toState()));
  assert.equal(back.outcome, "delivered");
  assert.equal(String(back.id), "del-1");
});

test("reconstitute rejects invalid state", () => {
  // delivered without completedAt
  assert.throws(() => {
    const s = deliveredState("del-x");
    const { completedAt: _omit, ...rest } = s;
    DeliveryRecord.reconstitute(rest as DeliveryRecordState);
  });
  // unknown outcome
  assert.throws(() =>
    DeliveryRecord.reconstitute({ ...deliveredState("del-y"), outcome: "teleported" as unknown as "delivered" }),
  );
  // unknown target
  assert.throws(() =>
    DeliveryRecord.reconstitute({ ...deliveredState("del-z"), target: "carrier-pigeon" as unknown as DeliveryTarget }),
  );
  // delivered must not carry a failureReason
  assert.throws(() =>
    DeliveryRecord.reconstitute({ ...deliveredState("del-w"), failureReason: "sink-unavailable" }),
  );
  // blocked outcome must carry a failureReason
  assert.throws(() => {
    const s = deliveredState("del-v");
    const { sinkKind: _s, attemptedAt: _a, completedAt: _c, ...rest } = s;
    DeliveryRecord.reconstitute({ ...rest, outcome: "blocked-not-eligible" } as DeliveryRecordState);
  });
  // blocked outcome must not have an attemptedAt
  assert.throws(() =>
    DeliveryRecord.reconstitute({
      ...deliveredState("del-u"),
      outcome: "blocked-not-eligible",
      failureReason: "review-not-approved",
    }),
  );
});

// Implementation 016 — delivery boundary behavior: eligible delivery to the test sink; every ineligible
// path is blocked and the sink is NOT called; success/failure never mutate the rendered record. Negative
// tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RenderedMessageRecord,
  renderedMessageRecordId,
  renderReview,
  renderReviewId,
  newRenderedMessageRecordId,
} from "../../rendering/index.ts";
import type { RenderedMessage, RenderReview } from "../../rendering/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

import {
  InMemoryDeliveryRecordRepository,
  InMemoryTestSink,
  deliveryRequest,
  newDeliveryRequestId,
  requestDelivery,
} from "../index.ts";
import type { DeliveryTarget, RequesterKind } from "../index.ts";

const NOW = timestamp("2026-03-01T12:00:00.000Z");
const CREATED = timestamp("2026-03-01T10:00:00.000Z");

function msg(over: Partial<RenderedMessage> = {}): RenderedMessage {
  return {
    text: "Reflecting on what we have: energy felt low. This may be incomplete.",
    sourceRef: "case:1",
    kind: "support",
    voice: "Reflection",
    uncertaintyPreserved: true,
    limitationsPreserved: true,
    traceabilityPreserved: true,
    warnings: [],
    ...over,
  };
}

function renderedRecord(id = "rec-1", sourceRef = "case:1"): RenderedMessageRecord {
  return RenderedMessageRecord.fromRenderedMessage({
    id: renderedMessageRecordId(id),
    message: msg({ sourceRef }),
    rendererKind: "fake",
    createdAt: CREATED,
  });
}

function review(recordId: string, decision: "approved-for-display" | "rejected-for-display" | "needs-revision"): RenderReview {
  return renderReview({
    id: renderReviewId(`rev-${recordId}-${decision}`),
    recordRef: renderedMessageRecordId(recordId),
    decision,
    reasons: decision === "approved-for-display" ? ["faithful-to-domain-output"] : ["voice-escalation"],
    reviewedAt: CREATED,
    reviewerKind: "test",
  });
}

function approved(id = "rec-1"): RenderedMessageRecord {
  return renderedRecord(id).appendReview(review(id, "approved-for-display"));
}

function request(recordRef: string, target: DeliveryTarget = "test-sink", requesterKind: RequesterKind = "system") {
  return deliveryRequest({
    id: newDeliveryRequestId(),
    renderedMessageRecordRef: renderedMessageRecordId(recordRef),
    target,
    requestedAt: NOW,
    requesterKind,
  });
}

function drive(record: RenderedMessageRecord | undefined, opts: { target?: DeliveryTarget; behavior?: "deliver" | "fail" | "cancel"; recordRef?: string } = {}) {
  const repo = new InMemoryDeliveryRecordRepository();
  const sink = new InMemoryTestSink(opts.behavior !== undefined ? { behavior: opts.behavior } : {});
  const ref = opts.recordRef ?? (record ? String(record.id) : "rec-missing");
  const result = requestDelivery({
    request: request(ref, opts.target ?? "test-sink"),
    renderedMessageRecord: record,
    sink,
    now: NOW,
    deliveryRecordRepository: repo,
  });
  return { repo, sink, result };
}

// UC1 — deliver eligible reviewed message.
test("display-eligible rendered message is delivered to the test sink", () => {
  const record = approved("rec-1");
  const { sink, result, repo } = drive(record);
  assert.equal(result.outcome, "delivered");
  assert.equal(result.failureReason, undefined);
  assert.ok(result.attemptedAt !== undefined && result.completedAt !== undefined);
  assert.equal(result.sinkKind, "test-sink");
  assert.equal(sink.delivered.length, 1);
  assert.equal(String(sink.delivered[0]?.recordRef), "rec-1");
  assert.ok(repo.exists(result.id));
});

// UC2 — block non-reviewed message (sink not called).
test("a not-reviewed record is blocked and the sink is not called", () => {
  const { sink, result } = drive(renderedRecord("rec-2"));
  assert.equal(result.outcome, "blocked-not-eligible");
  assert.equal(result.failureReason, "review-not-approved");
  assert.equal(result.attemptedAt, undefined);
  assert.equal(sink.delivered.length, 0);
});

// UC3 — block rejected message.
test("a rejected record is blocked and the sink is not called", () => {
  const record = renderedRecord("rec-3").appendReview(review("rec-3", "rejected-for-display"));
  const { sink, result } = drive(record);
  assert.equal(result.outcome, "blocked-not-eligible");
  assert.equal(result.failureReason, "review-not-approved");
  assert.equal(sink.delivered.length, 0);
});

// UC4 — block superseded message.
test("a superseded record is blocked (superseded-record) and the sink is not called", () => {
  const record = approved("rec-4").markSupersededBy(newRenderedMessageRecordId());
  const { sink, result } = drive(record);
  assert.equal(result.outcome, "blocked-not-eligible");
  assert.equal(result.failureReason, "superseded-record");
  assert.equal(sink.delivered.length, 0);
});

// UC5 — block failed render record.
test("a failed render record is blocked (failed-render-record) and the sink is not called", () => {
  const failed = RenderedMessageRecord.fromFailedOutcome({
    id: renderedMessageRecordId("rec-5"),
    sourceDomainOutputRef: "case:5",
    terminalOutputKind: "support",
    failures: ["voice-escalation"],
    rendererKind: "fake",
    createdAt: CREATED,
  });
  const { sink, result } = drive(failed);
  assert.equal(result.outcome, "blocked-not-eligible");
  assert.equal(result.failureReason, "failed-render-record");
  assert.equal(sink.delivered.length, 0);
});

// UC6 — missing record.
test("a missing record yields not-attempted (rendered-message-not-found); sink not called", () => {
  const { sink, result } = drive(undefined, { recordRef: "rec-gone" });
  assert.equal(result.outcome, "not-attempted");
  assert.equal(result.failureReason, "rendered-message-not-found");
  assert.equal(result.attemptedAt, undefined);
  assert.equal(sink.delivered.length, 0);
});

// UC7 — unsupported / reserved target is blocked.
test("an unsupported (reserved) target is blocked (unsupported-channel); sink not called", () => {
  const { sink, result } = drive(approved("rec-7"), { target: "future-ui" });
  assert.equal(result.outcome, "blocked-not-eligible");
  assert.equal(result.failureReason, "unsupported-channel");
  assert.equal(sink.delivered.length, 0);
});

// UC8 — delivery success does not mutate the rendered record / domain output.
test("delivery success does not mutate the rendered record", () => {
  const record = approved("rec-8");
  const before = JSON.stringify(record.toState());
  drive(record);
  assert.equal(JSON.stringify(record.toState()), before);
});

// UC9 — delivery failure does not invalidate the rendered record.
test("delivery failure (sink-unavailable) does not invalidate the rendered record", () => {
  const record = approved("rec-9");
  const before = JSON.stringify(record.toState());
  const { result } = drive(record, { behavior: "fail" });
  assert.equal(result.outcome, "failed");
  assert.equal(result.failureReason, "sink-unavailable");
  assert.equal(result.completedAt, undefined);
  assert.ok(result.attemptedAt !== undefined);
  assert.equal(JSON.stringify(record.toState()), before);
});

test("delivery cancellation records delivery-cancelled and does not invalidate the rendered record", () => {
  const record = approved("rec-10");
  const before = JSON.stringify(record.toState());
  const { result } = drive(record, { behavior: "cancel" });
  assert.equal(result.outcome, "cancelled");
  assert.equal(result.failureReason, "delivery-cancelled");
  assert.equal(JSON.stringify(record.toState()), before);
});

// Eligibility is reused, not reinterpreted: raw rendering reasons are retained on the check.
test("the eligibility check carries rendering's raw reasons verbatim", () => {
  const { result } = drive(renderedRecord("rec-11"));
  assert.ok(result.eligibility.reasons.some((r) => r.startsWith("review-status:")));
  assert.equal(result.eligibility.eligible, false);
});

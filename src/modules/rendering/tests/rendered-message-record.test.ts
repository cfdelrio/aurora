// Implementation 015 — RenderedMessageRecord: construction from a rendered/failed outcome, preservation,
// and derived display eligibility. The record audits presentation; it is never domain authority.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RenderedMessageRecord,
  displayEligibilityOf,
  renderedMessageRecordId,
  renderReview,
  renderReviewId,
} from "../index.ts";
import type { RenderedMessage } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);
const CREATED = T("2026-03-01T10:00:00.000Z");

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

function record(over: Partial<RenderedMessage> = {}) {
  return RenderedMessageRecord.fromRenderedMessage({
    id: renderedMessageRecordId("rec-1"),
    message: msg(over),
    rendererKind: "fake",
    createdAt: CREATED,
  });
}

function approval(recId = "rec-1") {
  return renderReview({
    id: renderReviewId("rev-1"),
    recordRef: renderedMessageRecordId(recId),
    decision: "approved-for-display",
    reasons: ["faithful-to-domain-output"],
    reviewedAt: T("2026-03-01T11:00:00.000Z"),
    reviewerKind: "test",
  });
}

// AC1-4 — record a validated rendered message, preserving the source contract -----------------------
test("records a validated rendered message preserving source ref / kind / voice / flags", () => {
  const r = record();
  assert.equal(r.sourceDomainOutputRef, "case:1");
  assert.equal(r.terminalOutputKind, "support");
  assert.equal(r.voice, "Reflection");
  assert.equal(r.text, msg().text);
  assert.equal(r.renderingStatus, "rendered");
  assert.deepEqual(r.preserved, { uncertaintyPreserved: true, limitationsPreserved: true, traceabilityPreserved: true });
});

// AC5 — initial record is not reviewed and not display-eligible ------------------------------------
test("a new record is not-reviewed and not display-eligible", () => {
  const r = record();
  assert.equal(r.currentReviewStatus(), "not-reviewed");
  const e = displayEligibilityOf(r);
  assert.equal(e.eligible, false);
  assert.ok(e.reasons.some((x) => x.startsWith("review-status:not-reviewed")));
});

// AC6/AC7 — approval makes it display-eligible without changing voice or the source ----------------
test("approval makes the record display-eligible and is immutable-by-operation (voice unchanged)", () => {
  const r = record();
  const approved = r.appendReview(approval());
  assert.notEqual(approved, r); // new record
  assert.equal(r.currentReviewStatus(), "not-reviewed"); // original untouched
  assert.equal(approved.currentReviewStatus(), "approved-for-display");
  assert.equal(approved.voice, "Reflection"); // approval changed no voice
  assert.equal(displayEligibilityOf(approved).eligible, true);
});

// AC8 — approval does not repair preservation flags (and eligibility still requires them) -----------
test("approval does not repair preservation flags; eligibility still requires them intact", () => {
  const r = record({ traceabilityPreserved: false });
  const approved = r.appendReview(approval());
  assert.equal(approved.preserved?.traceabilityPreserved, false); // not repaired by approval
  const e = displayEligibilityOf(approved);
  assert.equal(e.eligible, false);
  assert.ok(e.reasons.includes("validation-not-preserved"));
});

// AC9 — rejection leaves the rendering status intact (no domain invalidation) ----------------------
test("rejection does not invalidate the record / domain output", () => {
  const rejected = record().appendReview(
    renderReview({
      id: renderReviewId("rev-x"),
      recordRef: renderedMessageRecordId("rec-1"),
      decision: "rejected-for-display",
      reasons: ["voice-escalation"],
      reviewedAt: T("2026-03-01T11:00:00.000Z"),
      reviewerKind: "test",
    }),
  );
  assert.equal(rejected.renderingStatus, "rendered");
  assert.equal(rejected.currentReviewStatus(), "rejected-for-display");
  assert.equal(displayEligibilityOf(rejected).eligible, false);
});

// AC10 — a failed attempt can be recorded but never display-eligible / never approved ---------------
test("a failed attempt is recorded for audit, is never display-eligible, and cannot be approved", () => {
  const failed = RenderedMessageRecord.fromFailedOutcome({
    id: renderedMessageRecordId("rec-failed"),
    sourceDomainOutputRef: "case:1",
    terminalOutputKind: "support",
    failures: ["voice-escalation"],
    rendererKind: "fake",
    createdAt: CREATED,
  });
  assert.equal(failed.renderingStatus, "failed");
  assert.equal(failed.text, undefined);
  assert.equal(displayEligibilityOf(failed).eligible, false);
  assert.throws(() => failed.appendReview(approval("rec-failed")), /cannot be approved for display/);
});

// AC11 — needs-revision does not overwrite text ---------------------------------------------------
test("needs-revision keeps the text and history intact", () => {
  const r = record();
  const flagged = r.appendReview(
    renderReview({
      id: renderReviewId("rev-nr"),
      recordRef: renderedMessageRecordId("rec-1"),
      decision: "needs-revision",
      reasons: ["limitation-hidden"],
      reviewedAt: T("2026-03-01T11:00:00.000Z"),
      reviewerKind: "test",
    }),
  );
  assert.equal(flagged.text, r.text);
  assert.equal(flagged.currentReviewStatus(), "needs-revision");
});

// AC12/AC13 — supersession + revision preserve the old record --------------------------------------
test("supersession marks the record superseded without losing it; revision links a new record", () => {
  const original = record();
  const superseded = original.markSupersededBy(renderedMessageRecordId("rec-2"));
  assert.equal(original.supersededBy, undefined); // original immutable
  assert.equal(superseded.currentReviewStatus(), "superseded");
  assert.equal(displayEligibilityOf(superseded).eligible, false);

  const revision = RenderedMessageRecord.fromRenderedMessage({
    id: renderedMessageRecordId("rec-2"),
    message: msg({ text: "Reflecting again: energy felt low. This may be incomplete." }),
    rendererKind: "fake",
    createdAt: T("2026-03-02T10:00:00.000Z"),
    revisedFrom: renderedMessageRecordId("rec-1"),
  });
  assert.equal(String(revision.revisedFrom), "rec-1");
});

test("a record cannot supersede itself", () => {
  assert.throws(() => record().markSupersededBy(renderedMessageRecordId("rec-1")), /cannot supersede itself/);
});

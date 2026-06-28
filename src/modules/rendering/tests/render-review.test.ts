// Implementation 015 — RenderReview: append-only, closed decision/reason catalogs, derived-only statuses
// rejected as appended decisions.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RENDER_REVIEW_DECISIONS,
  RENDER_REVIEW_REASONS,
  renderReview,
  renderReviewId,
  renderedMessageRecordId,
} from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const T = (iso: string) => timestamp(iso);

function base(over: Record<string, unknown> = {}) {
  return {
    id: renderReviewId("rev-1"),
    recordRef: renderedMessageRecordId("rec-1"),
    decision: "approved-for-display" as const,
    reasons: ["faithful-to-domain-output"] as const,
    reviewedAt: T("2026-03-01T11:00:00.000Z"),
    reviewerKind: "test" as const,
    ...over,
  };
}

test("constructs a valid appended review", () => {
  const r = renderReview(base());
  assert.equal(r.decision, "approved-for-display");
  assert.deepEqual([...r.reasons], ["faithful-to-domain-output"]);
});

test("the derived-only statuses are not appendable decisions", () => {
  for (const decision of ["not-reviewed", "superseded"] as const) {
    assert.throws(() => renderReview(base({ decision })), /not the derived/);
  }
});

test("an unknown reason is rejected", () => {
  assert.throws(() => renderReview(base({ reasons: ["totally-made-up"] })), /closed reason set/);
});

test("an empty reason list is rejected", () => {
  assert.throws(() => renderReview(base({ reasons: [] })), /at least one reason/);
});

test("an invalid reviewer kind is rejected", () => {
  assert.throws(() => renderReview(base({ reviewerKind: "robot" })), /system \| human \| test/);
});

test("the closed catalogs hold exactly the specified values", () => {
  assert.equal(RENDER_REVIEW_DECISIONS.length, 5);
  assert.equal(RENDER_REVIEW_REASONS.length, 11);
  assert.ok(RENDER_REVIEW_DECISIONS.includes("approved-for-display"));
  assert.ok(RENDER_REVIEW_REASONS.includes("superseded-by-new-render"));
});

test("review history is append-only across multiple reviews (no overwrite)", () => {
  // built up through the record in the record test; here we assert two distinct reviews are distinct values
  const a = renderReview(base({ id: renderReviewId("rev-a"), decision: "needs-revision", reasons: ["limitation-hidden"] }));
  const b = renderReview(base({ id: renderReviewId("rev-b"), decision: "approved-for-display" }));
  assert.notEqual(String(a.id), String(b.id));
  assert.equal(a.decision, "needs-revision");
  assert.equal(b.decision, "approved-for-display");
});

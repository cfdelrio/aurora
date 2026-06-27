// Implementation 015 — RenderedMessageRecord persistence: repository port round-trip, mutation isolation,
// append-only review survival, and validated reconstitution (invalid state rejected).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryRenderedMessageRecordRepository,
  RenderedMessageRecord,
  renderedMessageRecordId,
  renderReview,
  renderReviewId,
} from "../index.ts";
import type { RenderedMessage, RenderedMessageRecordState } from "../index.ts";
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

function record(id = "rec-1", sourceRef = "case:1") {
  return RenderedMessageRecord.fromRenderedMessage({
    id: renderedMessageRecordId(id),
    message: msg({ sourceRef }),
    rendererKind: "fake",
    createdAt: CREATED,
  });
}

test("save then findById/exists returns an equal record (with review history)", () => {
  const repo = new InMemoryRenderedMessageRecordRepository();
  const approved = record().appendReview(
    renderReview({
      id: renderReviewId("rev-1"),
      recordRef: renderedMessageRecordId("rec-1"),
      decision: "approved-for-display",
      reasons: ["faithful-to-domain-output"],
      reviewedAt: T("2026-03-01T11:00:00.000Z"),
      reviewerKind: "test",
    }),
  );
  repo.save(approved);
  assert.ok(repo.exists(renderedMessageRecordId("rec-1")));
  const back = repo.findById(renderedMessageRecordId("rec-1"));
  assert.equal(back?.currentReviewStatus(), "approved-for-display");
  assert.equal(back?.reviews.length, 1);
});

test("findBySourceDomainOutputRef returns records for that source", () => {
  const repo = new InMemoryRenderedMessageRecordRepository();
  repo.save(record("rec-1", "case:1"));
  repo.save(record("rec-2", "case:2"));
  const found = repo.findBySourceDomainOutputRef("case:1");
  assert.deepEqual(found.map((r) => String(r.id)), ["rec-1"]);
});

test("repository stores copies: two finds are independent, equal instances", () => {
  const repo = new InMemoryRenderedMessageRecordRepository();
  repo.save(record());
  const a = repo.findById(renderedMessageRecordId("rec-1"));
  const b = repo.findById(renderedMessageRecordId("rec-1"));
  assert.ok(a && b);
  assert.notEqual(a, b);
  assert.equal(a.text, b.text);
});

test("reconstitute rejects an invalid state (failed record carrying text)", () => {
  const good = RenderedMessageRecord.fromFailedOutcome({
    id: renderedMessageRecordId("rec-f"),
    sourceDomainOutputRef: "case:1",
    terminalOutputKind: "support",
    failures: ["voice-escalation"],
    rendererKind: "fake",
    createdAt: CREATED,
  }).toState();
  const tampered = { ...good, text: "leaked text" } as RenderedMessageRecordState;
  assert.throws(() => RenderedMessageRecord.reconstitute(tampered), /requires failures and no text/);
});

test("reconstitute rejects a failed record carrying an approved-for-display review", () => {
  const good = record().toState();
  const tampered = {
    ...good,
    renderingStatus: "failed" as const,
    text: undefined,
    preserved: undefined,
    failures: ["voice-escalation"] as const,
    reviews: [
      renderReview({
        id: renderReviewId("rev-1"),
        recordRef: renderedMessageRecordId("rec-1"),
        decision: "approved-for-display",
        reasons: ["faithful-to-domain-output"],
        reviewedAt: T("2026-03-01T11:00:00.000Z"),
        reviewerKind: "test",
      }),
    ],
  } as unknown as RenderedMessageRecordState;
  assert.throws(() => RenderedMessageRecord.reconstitute(tampered), /cannot carry an approved-for-display review/);
});

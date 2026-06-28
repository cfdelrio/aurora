// Implementation 024 — the output-out occurrence event surface: pure, ref-only factories that record provider /
// rendering / review-display / delivery occurrences as DomainEventRecords. Each references existing artifacts by
// id only, carries no raw content, persists nothing, and triggers nothing. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DOMAIN_EVENT_CATALOG,
  catalogEntry,
  isDomainEventType,
  isEventArtifactKind,
  isProducingModule,
  domainEventRecordId,
  providerAttemptRecordedEvent,
  providerDraftValidationFailedEvent,
  providerDraftValidationPassedEvent,
  renderedMessageRecordedEvent,
  renderReviewRecordedEvent,
  displayEligibilityDerivedEvent,
  deliveryRequestRecordedEvent,
  deliveryOutcomeRecordedEvent,
} from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const OCCURRED = timestamp("2026-08-01T10:00:00.000Z");
const RECORDED = timestamp("2026-08-01T10:00:05.000Z");
const T = { occurredAt: OCCURRED, recordedAt: RECORDED } as const;

// --- catalog additions ---------------------------------------------------------------------------

test("the additive output-out event types exist with the correct module/category/primary", () => {
  const expected: ReadonlyArray<readonly [string, string, string, string]> = [
    ["ProviderAttemptRecorded", "rendering", "occurrence", "ProviderAttemptRecord"],
    ["ProviderDraftValidationFailed", "rendering", "outcome", "ProviderAttemptRecord"],
    ["ProviderDraftValidationPassed", "rendering", "outcome", "ProviderAttemptRecord"],
    ["RenderedMessageRecorded", "rendering", "occurrence", "RenderedMessageRecord"],
    ["RenderReviewRecorded", "rendering", "outcome", "RenderReview"],
    ["DisplayEligibilityDerived", "rendering", "occurrence", "RenderedMessageRecord"],
    ["DeliveryRequestRecorded", "delivery", "occurrence", "DeliveryRequest"],
    ["DeliveryOutcomeRecorded", "delivery", "outcome", "DeliveryRecord"],
  ];
  for (const [type, module, category, primary] of expected) {
    assert.ok(isDomainEventType(type), `${type} must be a catalog member`);
    const entry = catalogEntry(type as keyof typeof DOMAIN_EVENT_CATALOG);
    assert.equal(entry.module, module);
    assert.equal(entry.category, category);
    assert.equal(entry.primaryKind, primary);
  }
});

test("the additive artifact kinds and producing modules exist (and DisplayEligibility is NOT a kind)", () => {
  for (const k of ["ProviderAttemptRecord", "RenderedMessageRecord", "RenderReview", "DeliveryRequest", "DeliveryRecord"]) {
    assert.ok(isEventArtifactKind(k), `${k} must be an artifact kind`);
  }
  assert.equal(isEventArtifactKind("DisplayEligibility"), false, "DisplayEligibility is id-less; not an artifact kind");
  assert.ok(isProducingModule("rendering"));
  assert.ok(isProducingModule("delivery"));
  assert.equal(isProducingModule("provider"), false, "no provider producing module");
});

// --- factory behavior (ref-only, correct shape) --------------------------------------------------

test("provider attempt event references the attempt record id only", () => {
  const rec = providerAttemptRecordedEvent({ providerAttemptRecordId: "pa:1", ...T });
  assert.equal(rec.type, "ProviderAttemptRecorded");
  assert.equal(rec.traceability.primaryArtifactRef.kind, "ProviderAttemptRecord");
  assert.equal(rec.traceability.primaryArtifactRef.id, "pa:1");
  assert.equal(rec.payloadRefs.length, 0);
});

test("provider draft validation failed carries a safe reason via role and creates no rendered record", () => {
  const rec = providerDraftValidationFailedEvent({ providerAttemptRecordId: "pa:2", failureReason: "voice-escalation", ...T });
  assert.equal(rec.type, "ProviderDraftValidationFailed");
  assert.equal(rec.category, "outcome");
  assert.equal(rec.traceability.primaryArtifactRef.role, "voice-escalation");
  // no RenderedMessageRecord ref anywhere
  const kinds = [rec.traceability.primaryArtifactRef.kind, ...rec.traceability.sourceRefs.map((r) => r.kind)];
  assert.equal(kinds.includes("RenderedMessageRecord"), false);
});

test("provider draft validation passed may reference a rendered-message record only if given", () => {
  const without = providerDraftValidationPassedEvent({ providerAttemptRecordId: "pa:3", ...T });
  assert.equal(without.traceability.sourceRefs.length, 0);
  const withRec = providerDraftValidationPassedEvent({ providerAttemptRecordId: "pa:3", renderedMessageRecordId: "rmr:9", ...T });
  assert.equal(withRec.traceability.sourceRefs[0]?.kind, "RenderedMessageRecord");
  assert.equal(withRec.traceability.sourceRefs[0]?.id, "rmr:9");
});

test("rendered message recorded references the record id only", () => {
  const rec = renderedMessageRecordedEvent({ renderedMessageRecordId: "rmr:1", ...T });
  assert.equal(rec.traceability.primaryArtifactRef.kind, "RenderedMessageRecord");
  assert.equal(rec.traceability.primaryArtifactRef.id, "rmr:1");
});

test("render review references the review id + record id + reason code", () => {
  const rec = renderReviewRecordedEvent({ renderReviewId: "rev:1", renderedMessageRecordId: "rmr:1", decision: "approved-for-display", ...T });
  assert.equal(rec.traceability.primaryArtifactRef.kind, "RenderReview");
  assert.equal(rec.traceability.primaryArtifactRef.role, "approved-for-display");
  assert.equal(rec.traceability.sourceRefs[0]?.kind, "RenderedMessageRecord");
});

test("display eligibility is carried as a role on the rendered-message record (no id-less artifact)", () => {
  const eligible = displayEligibilityDerivedEvent({ renderedMessageRecordId: "rmr:1", eligible: true, ...T });
  assert.equal(eligible.traceability.primaryArtifactRef.kind, "RenderedMessageRecord");
  assert.equal(eligible.traceability.primaryArtifactRef.role, "display-eligible");
  const ineligible = displayEligibilityDerivedEvent({ renderedMessageRecordId: "rmr:1", eligible: false, ...T });
  assert.equal(ineligible.traceability.primaryArtifactRef.role, "display-ineligible");
});

test("delivery request/outcome reference delivery ids and the prior artifacts", () => {
  const reqEvt = deliveryRequestRecordedEvent({ deliveryRequestId: "dreq:1", renderedMessageRecordId: "rmr:1", targetSummary: "test-sink", ...T });
  assert.equal(reqEvt.type, "DeliveryRequestRecorded");
  assert.equal(reqEvt.traceability.primaryArtifactRef.kind, "DeliveryRequest");
  assert.equal(reqEvt.traceability.primaryArtifactRef.role, "test-sink");
  assert.equal(reqEvt.traceability.sourceRefs[0]?.kind, "RenderedMessageRecord");

  const outEvt = deliveryOutcomeRecordedEvent({ deliveryRecordId: "drec:1", deliveryRequestId: "dreq:1", outcome: "delivered", ...T });
  assert.equal(outEvt.type, "DeliveryOutcomeRecorded");
  assert.equal(outEvt.traceability.primaryArtifactRef.kind, "DeliveryRecord");
  assert.equal(outEvt.traceability.primaryArtifactRef.role, "delivered");
  assert.equal(outEvt.traceability.sourceRefs[0]?.kind, "DeliveryRequest");
});

test("a deterministic id can be supplied; timing is preserved", () => {
  const rec = providerAttemptRecordedEvent({ providerAttemptRecordId: "pa:1", id: domainEventRecordId("evt:fixed"), ...T });
  assert.equal(String(rec.id), "evt:fixed");
  assert.equal(rec.occurredAt.iso, OCCURRED.iso);
});

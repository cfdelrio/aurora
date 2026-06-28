// Implementation 018 — provider attempt audit: observe a real ProviderRenderOutcome (Impl 017) and map it
// to a safe ProviderAttemptRecord — no raw draft retained, refs/reasons preserved, no message/record/review/
// delivery created. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { FakeProviderAdapter, requestProviderRendering, auditProviderAttempt } from "../index.ts";
import type { ProviderRenderOutcome } from "../index.ts";
import { supportRenderable, inquiryRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const REQUESTED = timestamp("2026-03-01T10:00:00.000Z");
const COMPLETED = timestamp("2026-03-01T10:00:01.000Z");
const CREATED = timestamp("2026-03-01T10:00:02.000Z");

function audit(request: Parameters<typeof requestProviderRendering>[0]["request"], scenario: "safe" | "voice-escalating" | "unavailable") {
  const provider = new FakeProviderAdapter({ scenario });
  const outcome = requestProviderRendering({ request, provider });
  return auditProviderAttempt({
    request,
    outcome,
    providerAdapterKind: provider.kind,
    requestedAt: REQUESTED,
    completedAt: COMPLETED,
    createdAt: CREATED,
  });
}

// UC1 — successful provider attempt → validation-passed.
test("a successful provider attempt is audited as validation-passed", () => {
  const rec = audit(req(supportRenderable()), "safe");
  assert.equal(rec.status, "validation-passed");
  assert.equal(rec.producedRenderedMessage, true);
  assert.equal(rec.renderableOutputRef, "case:1");
  assert.equal(rec.terminalOutputKind, "support");
  assert.equal(rec.voice, "Reflection");
  assert.equal(rec.providerAdapterKind, "fake");
  assert.equal(rec.draftSummary.draftProduced, true);
  assert.equal(rec.draftSummary.rawDraftRetained, false);
});

// UC2 — validation failure → validation-failed, reasons preserved.
test("a validation-failure attempt is audited with the rendering failure reasons", () => {
  const rec = audit(req(supportRenderable({ voice: "Reflection" })), "voice-escalating");
  assert.equal(rec.status, "validation-failed");
  assert.equal(rec.producedRenderedMessage, false);
  assert.ok(rec.renderingFailureReasons?.includes("voice-escalation"));
  assert.equal(rec.draftSummary.draftProduced, true);
  assert.equal(rec.draftSummary.validationFailureCount, rec.renderingFailureReasons?.length);
});

// UC3 — provider failure → provider-failed.
test("a provider-failure attempt is audited as provider-failed", () => {
  const rec = audit(req(supportRenderable()), "unavailable");
  assert.equal(rec.status, "provider-failed");
  assert.equal(rec.producedRenderedMessage, false);
  assert.equal(rec.providerFailureReason, "provider-unavailable");
  assert.equal(rec.draftSummary.draftProduced, false);
});

// UC4 — unsafe request blocked before the provider call → unsafe-request-blocked.
test("an unsafe-request-blocked attempt is audited without claiming a provider call", () => {
  const request = req(supportRenderable(), { style: "be decisive" });
  // spy provider proves the seam never called it; the audit observes the resulting failed outcome
  const spy = { kind: "fake", draft(): never { throw new Error("provider must not be called"); } };
  const outcome = requestProviderRendering({ request, provider: spy });
  const rec = auditProviderAttempt({
    request,
    outcome,
    providerAdapterKind: "fake",
    requestedAt: REQUESTED,
    completedAt: COMPLETED,
    createdAt: CREATED,
  });
  assert.equal(rec.status, "unsafe-request-blocked");
  assert.equal(rec.producedRenderedMessage, false);
  assert.equal(rec.draftSummary.draftProduced, false);
  assert.equal(rec.providerFailureReason, "unsupported-style");
});

// UC5 — raw unsafe draft is not retained.
test("no raw draft / unsafe text is retained in the audit record", () => {
  const rec = audit(req(supportRenderable({ forbiddenClaims: ["resting hr was 80"] })), "voice-escalating");
  const json = JSON.stringify(rec.toState()).toLowerCase();
  // content-only checks: the audit may carry fields NAMED "draft*" (draftSummary/draftProduced/
  // rawDraftRetained), but never the raw draft TEXT or any unsafe excerpt/prompt content.
  for (const banned of ["chain-of-thought", "you should", "resting hr was 80", "reflecting on what we have"]) {
    assert.ok(!json.includes(banned), `audit must not retain raw content '${banned}'`);
  }
  // structurally, the draft summary carries no raw-text field
  for (const key of Object.keys(rec.draftSummary)) {
    assert.ok(!["text", "content", "raw", "excerpt", "prompt"].includes(key), `draftSummary must not carry '${key}'`);
  }
  assert.equal(rec.draftSummary.rawDraftRetained, false);
});

// UC6 — audit does not produce a RenderedMessage/record (it returns only a ProviderAttemptRecord).
test("auditing returns only a ProviderAttemptRecord (no message/record fields)", () => {
  const rec = audit(req(inquiryRenderable()), "safe");
  const keys = Object.keys(rec.toState());
  assert.equal(keys.includes("text"), false);
  assert.equal(keys.includes("message"), false);
  assert.equal(keys.includes("reviews"), false);
  assert.equal(keys.includes("supersededBy"), false);
});

// UC8 — the audit does not mutate the request/renderable (no domain effect).
test("auditing does not mutate the request or renderable", () => {
  const request = req(supportRenderable());
  const before = JSON.stringify(request);
  audit(request, "safe");
  assert.equal(JSON.stringify(request), before);
});

// `requested` / `draft-produced` are reserved (not produced by the single-shot audit).
test("the audit produces only terminal statuses (requested/draft-produced are reserved)", () => {
  const outcomes: ProviderRenderOutcome[] = [];
  for (const scenario of ["safe", "voice-escalating", "unavailable"] as const) {
    const provider = new FakeProviderAdapter({ scenario });
    outcomes.push(requestProviderRendering({ request: req(supportRenderable()), provider }));
  }
  for (const outcome of outcomes) {
    const rec = auditProviderAttempt({
      request: req(supportRenderable()),
      outcome,
      providerAdapterKind: "fake",
      requestedAt: REQUESTED,
      completedAt: COMPLETED,
      createdAt: CREATED,
    });
    assert.ok(["validation-passed", "validation-failed", "provider-failed", "unsafe-request-blocked"].includes(rec.status));
    assert.notEqual(rec.status, "requested");
    assert.notEqual(rec.status, "draft-produced");
  }
});

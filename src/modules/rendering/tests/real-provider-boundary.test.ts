// Implementation 019 — real-provider-ready boundary: a fake/in-process async client's draft becomes a
// RenderedMessage ONLY by passing the unchanged validateDraft; unsafe drafts are rejected; success has no
// side effects; the raw-free audit observes the outcome unchanged. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FakeProviderClient,
  requestRealProviderRendering,
  auditProviderAttempt,
} from "../index.ts";
import type {
  FakeProviderClientScenario,
  ProviderClientBoundary,
  ProviderClientConfig,
  ProviderSecretRef,
  RenderingRequest,
  RenderableDomainOutput,
} from "../index.ts";
import { supportRenderable, inquiryRenderable, withholdingRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const CONFIG: ProviderClientConfig = { providerKind: "fake" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:fake" };

function run(request: RenderingRequest, scenario: FakeProviderClientScenario) {
  return requestRealProviderRendering({
    request,
    client: new FakeProviderClient({ scenario }),
    config: CONFIG,
    secret: PRESENT,
  });
}

// UC1 — safe draft becomes a RenderedMessage, only via validateDraft.
test("a safe fake-client draft becomes a RenderedMessage after validation", async () => {
  const out = await run(req(supportRenderable()), "safe");
  assert.equal(out.status, "rendered");
  if (out.status !== "rendered") return;
  assert.equal(out.providerKind, "fake");
  assert.equal(out.message.sourceRef, "case:1");
  assert.equal(out.message.kind, "support");
  assert.equal(out.message.voice, "Reflection");
  assert.equal(out.message.uncertaintyPreserved, true);
});

test("safe inquiry and withholding drafts render as inquiry / withholding", async () => {
  assert.equal((await run(req(inquiryRenderable()), "safe")).status, "rendered");
  assert.equal((await run(req(withholdingRenderable()), "safe")).status, "rendered");
});

// UC2 — voice escalation rejected by the unchanged validator.
test("a voice-escalating draft is rejected (provider-output-failed-validation / voice-escalation)", async () => {
  const out = await run(req(supportRenderable({ voice: "Reflection" })), "voice-escalating");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "provider-output-failed-validation");
  assert.ok(out.renderingFailures?.includes("voice-escalation"));
});

// UC3 — invented fact rejected.
test("an invented-fact draft is rejected", async () => {
  const out = await run(req(supportRenderable({ forbiddenClaims: ["resting hr was 80"] })), "invented-fact");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "provider-output-failed-validation");
  assert.ok(out.renderingFailures?.includes("invented-fact"));
});

// UC4 — hidden uncertainty rejected.
test("a hidden-uncertainty draft is rejected", async () => {
  const out = await run(req(supportRenderable({ uncertaintyVisibleRequired: true, limitations: [] })), "hidden-uncertainty");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.ok(out.renderingFailures?.includes("uncertainty-hidden"));
});

// UC6 — unsafe request rejected before any client call.
test("an unsafe request (unsupported style) is rejected before the client is called", async () => {
  const spy: ProviderClientBoundary = {
    kind: "spy",
    requestDraft(): Promise<never> {
      throw new Error("client must not be called for an unsafe request");
    },
  };
  const out = await requestRealProviderRendering({
    request: req(supportRenderable(), { style: "be decisive" }),
    client: spy,
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "unsupported-style");
});

// UC9 — success does not mutate the renderable / create downstream artifacts (the service returns an outcome only).
test("provider success does not mutate the renderable and yields only a ProviderRenderOutcome", async () => {
  const renderable: RenderableDomainOutput = supportRenderable();
  const before = JSON.stringify(renderable);
  const out = await run(req(renderable), "safe");
  assert.equal(JSON.stringify(renderable), before);
  // the outcome is a ProviderRenderOutcome — no record/review/display/delivery field
  const keys = Object.keys(out);
  for (const banned of ["record", "review", "displayEligibility", "delivery", "event"]) {
    assert.equal(keys.includes(banned), false);
  }
});

// UC8 — the raw-free audit observes the real outcome unchanged; no raw draft retained.
test("the provider-attempt audit observes a real outcome and retains no raw draft", async () => {
  const out = await run(req(supportRenderable()), "safe");
  const rec = auditProviderAttempt({
    request: req(supportRenderable()),
    outcome: out,
    providerAdapterKind: "fake",
    requestedAt: timestamp("2026-03-01T10:00:00.000Z"),
    completedAt: timestamp("2026-03-01T10:00:01.000Z"),
    createdAt: timestamp("2026-03-01T10:00:02.000Z"),
  });
  assert.equal(rec.status, "validation-passed");
  assert.equal(rec.draftSummary.rawDraftRetained, false);
  const json = JSON.stringify(rec.toState()).toLowerCase();
  for (const banned of ["reflecting on what we have", "you should", "ref:fake"]) {
    assert.ok(!json.includes(banned), `audit must not retain '${banned}'`);
  }
});

// UC10 — provider metadata is operational, not a domain field on the outcome.
test("provider metadata does not appear as a domain field on the rendered outcome", async () => {
  const out = await run(req(supportRenderable()), "safe");
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["latencyms", "tokencount", "finishreason", "metadata"]) {
    assert.ok(!json.includes(banned), `outcome must not surface operational metadata as a domain field: '${banned}'`);
  }
});

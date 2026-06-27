// Implementation 017 — provider rendering service: a safe fake provider draft becomes a RenderedMessage
// ONLY after the mandatory validateDraft; every unsafe draft is rejected; failures degrade to safe
// non-rendering; unsafe requests are rejected before the provider call. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { FakeProviderAdapter, requestProviderRendering } from "../index.ts";
import type { FakeProviderScenario } from "../index.ts";
import { supportRenderable, inquiryRenderable, withholdingRenderable, req } from "./fixtures.ts";
import type { RenderableDomainOutput, RenderingRequest } from "../index.ts";

function run(request: RenderingRequest, scenario: FakeProviderScenario) {
  return requestProviderRendering({ request, provider: new FakeProviderAdapter({ scenario }) });
}

// UC1 — safe provider draft becomes a RenderedMessage, only via validateDraft.
test("a safe provider draft becomes a RenderedMessage after validation", () => {
  const out = run(req(supportRenderable()), "safe");
  assert.equal(out.status, "rendered");
  if (out.status !== "rendered") return;
  assert.equal(out.providerKind, "fake");
  assert.equal(out.message.sourceRef, "case:1");
  assert.equal(out.message.kind, "support");
  assert.equal(out.message.voice, "Reflection");
  assert.equal(out.message.uncertaintyPreserved, true);
});

test("a safe inquiry draft renders as an inquiry; a safe withholding draft renders as withholding", () => {
  const inq = run(req(inquiryRenderable()), "safe");
  assert.equal(inq.status, "rendered");
  const wh = run(req(withholdingRenderable()), "safe");
  assert.equal(wh.status, "rendered");
});

// UC2 — voice escalation rejected.
test("a voice-escalating draft is rejected (provider-output-failed-validation / voice-escalation)", () => {
  const out = run(req(supportRenderable({ voice: "Reflection" })), "voice-escalating");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "provider-output-failed-validation");
  assert.ok(out.renderingFailures?.includes("voice-escalation"));
});

// UC3 — invented fact rejected.
test("an invented-fact draft is rejected", () => {
  const renderable = supportRenderable({ forbiddenClaims: ["resting heart rate was 80"] });
  const out = run(req(renderable), "invented-fact");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "provider-output-failed-validation");
  assert.ok(out.renderingFailures?.includes("invented-fact"));
});

// UC4 — hidden uncertainty rejected.
test("an uncertainty-hidden draft is rejected", () => {
  const out = run(req(supportRenderable({ uncertaintyVisibleRequired: true, limitations: [] })), "uncertainty-hidden");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.ok(out.renderingFailures?.includes("uncertainty-hidden"));
});

// UC5 — hidden limitation rejected.
test("a limitation-hidden draft is rejected", () => {
  const out = run(req(supportRenderable({ limitations: ["power data missing"] })), "limitation-hidden");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.ok(out.renderingFailures?.includes("limitation-hidden"));
});

// UC6/UC7 — inquiry-as-answer & withholding-as-advice rejected.
test("an inquiry-as-answer draft is rejected", () => {
  const out = run(req(inquiryRenderable()), "inquiry-as-answer");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.ok(out.renderingFailures?.includes("inquiry-rendered-as-answer"));
});

test("a withholding-as-advice draft is rejected", () => {
  const out = run(req(withholdingRenderable()), "withholding-as-advice");
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.ok(out.renderingFailures?.includes("withholding-rendered-as-advice"));
});

// UC8 — provider failures degrade to safe non-rendering (each closed failure is reachable).
test("provider failures degrade to safe non-rendering with the right closed reason", () => {
  const cases: ReadonlyArray<readonly [FakeProviderScenario, string]> = [
    ["empty-draft", "provider-returned-empty-draft"],
    ["invalid", "provider-returned-invalid-draft"],
    ["unavailable", "provider-unavailable"],
    ["timeout", "provider-timeout"],
    ["rate-limited", "provider-rate-limited"],
    ["refused", "provider-refused"],
  ];
  for (const [scenario, expected] of cases) {
    const out = run(req(supportRenderable()), scenario);
    assert.equal(out.status, "failed");
    if (out.status !== "failed") continue;
    assert.equal(out.failure, expected);
    assert.equal(out.renderingFailures, undefined); // not a validation failure
  }
});

// UC9 — unsafe request rejected before the provider call.
test("an unsupported style is rejected before the provider is called", () => {
  // a spy provider that throws if invoked — proving the provider was never called
  const spy = {
    kind: "spy",
    draft(): never {
      throw new Error("provider must not be called for an unsafe request");
    },
  };
  const request = req(supportRenderable(), { style: "be decisive" });
  const out = requestProviderRendering({ request, provider: spy });
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.equal(out.failure, "unsupported-style");
});

test("an unsupported locale and an empty renderable are rejected before the provider call", () => {
  const spy = {
    kind: "spy",
    draft(): never {
      throw new Error("provider must not be called");
    },
  };
  const badLocale = requestProviderRendering({ request: req(supportRenderable(), { locale: "fr" }), provider: spy });
  assert.equal(badLocale.status, "failed");
  if (badLocale.status === "failed") assert.equal(badLocale.failure, "unsupported-locale");

  const empty = requestProviderRendering({ request: req(supportRenderable({ contentAtoms: [] })), provider: spy });
  assert.equal(empty.status, "failed");
  if (empty.status === "failed") assert.equal(empty.failure, "unsafe-provider-request");
});

// UC14 — no domain mutation: the renderable is unchanged before/after.
test("provider rendering does not mutate the renderable / request", () => {
  const renderable: RenderableDomainOutput = supportRenderable();
  const before = JSON.stringify(renderable);
  run(req(renderable), "safe");
  assert.equal(JSON.stringify(renderable), before);
});

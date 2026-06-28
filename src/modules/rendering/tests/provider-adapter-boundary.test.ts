// Implementation 017 — provider adapter + request-construction boundary: the constrained request carries
// only safe domain-approved fields (no raw reasoning / chain-of-thought / mutable handle); the fake
// provider is deterministic and returns only a draft/failure (never a RenderedMessage); a provider draft
// is not a RenderedMessage. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { FakeProviderAdapter, providerRenderingRequestFrom, PROVIDER_FAILURES, isProviderFailure } from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";

test("providerRenderingRequestFrom builds a constrained request carrying only safe domain-approved fields", () => {
  const built = providerRenderingRequestFrom(req(supportRenderable({ voice: "Reflection" }), { style: "clearer", locale: "en" }));
  assert.equal(built.status, "built");
  if (built.status !== "built") return;
  const pr = built.providerRequest;
  assert.equal(pr.sourceCaseRef, "case:1");
  assert.equal(pr.kind, "support");
  assert.equal(pr.voice, "Reflection");
  assert.equal(pr.style, "clearer");
  assert.equal(pr.locale, "en");
  // only the safe, domain-approved keys are present — no raw-reasoning / chain-of-thought / handle fields
  const allowedKeys = new Set([
    "sourceCaseRef",
    "kind",
    "voice",
    "contentAtoms",
    "allowedClaims",
    "forbiddenClaims",
    "uncertaintyVisibleRequired",
    "limitations",
    "traceabilitySummary",
    "traceabilityStatus",
    "style",
    "locale",
    "maxLength",
  ]);
  for (const key of Object.keys(pr)) {
    assert.ok(allowedKeys.has(key), `provider request must not carry field '${key}'`);
  }
  const json = JSON.stringify(pr).toLowerCase();
  for (const banned of ["hypothesis", "evidence", "chain-of-thought", "chainofthought", "reasoning", "prompt", "aggregate", "repository"]) {
    assert.ok(!json.includes(banned), `provider request must not expose '${banned}'`);
  }
});

test("providerRenderingRequestFrom rejects unsafe style / locale / empty renderable", () => {
  assert.equal(providerRenderingRequestFrom(req(supportRenderable(), { style: "be decisive" })).status, "rejected");
  assert.equal(providerRenderingRequestFrom(req(supportRenderable(), { locale: "fr" })).status, "rejected");
  assert.equal(providerRenderingRequestFrom(req(supportRenderable({ contentAtoms: [] }))).status, "rejected");
});

test("the FakeProviderAdapter is deterministic (same scenario + request → same output)", () => {
  const built = providerRenderingRequestFrom(req(supportRenderable()));
  assert.equal(built.status, "built");
  if (built.status !== "built") return;
  const a = new FakeProviderAdapter({ scenario: "safe" }).draft(built.providerRequest);
  const b = new FakeProviderAdapter({ scenario: "safe" }).draft(built.providerRequest);
  assert.deepEqual(a, b);
});

test("the provider adapter returns only a draft or a failure — never a RenderedMessage", () => {
  const built = providerRenderingRequestFrom(req(supportRenderable()));
  assert.equal(built.status, "built");
  if (built.status !== "built") return;
  const outcome = new FakeProviderAdapter({ scenario: "safe" }).draft(built.providerRequest);
  assert.ok(outcome.status === "drafted" || outcome.status === "failed");
  if (outcome.status === "drafted") {
    // a ProviderDraft is not a RenderedMessage: it has no preservation flags it set itself
    assert.deepEqual(Object.keys(outcome.draft).sort(), ["providerKind", "text", "warnings"]);
    assert.equal("uncertaintyPreserved" in outcome.draft, false);
    assert.equal("traceabilityPreserved" in outcome.draft, false);
  }
});

test("a failed-scenario provider returns a closed ProviderFailure", () => {
  const built = providerRenderingRequestFrom(req(supportRenderable()));
  if (built.status !== "built") return;
  const outcome = new FakeProviderAdapter({ scenario: "unavailable" }).draft(built.providerRequest);
  assert.equal(outcome.status, "failed");
  if (outcome.status !== "failed") return;
  assert.ok(isProviderFailure(outcome.failure));
  assert.equal(outcome.failure, "provider-unavailable");
});

test("the ProviderFailure catalog is closed and holds exactly the specified values", () => {
  assert.equal(PROVIDER_FAILURES.length, 10);
  assert.ok(PROVIDER_FAILURES.includes("provider-output-failed-validation"));
  assert.ok(PROVIDER_FAILURES.includes("unsafe-provider-request"));
  assert.equal(PROVIDER_FAILURES.includes("provider-unavailable"), true);
});

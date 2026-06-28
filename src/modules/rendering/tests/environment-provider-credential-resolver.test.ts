// Implementation 022 — the environment credential resolver reads ONE explicitly configured key from an INJECTED
// source map (no real environment, no scan), classifies missing/invalid/available deterministically, and returns
// the existing ProviderCredentialResolution. Credential availability is NOT live-call enablement; the raw secret
// never appears in failures, the provider-client outcome, or the raw-free audit. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EnvironmentProviderCredentialResolver,
  LiveProviderClient,
  LiveCallPolicy,
  requestRealProviderRendering,
  auditProviderAttempt,
} from "../index.ts";
import type {
  EnvironmentCredentialSource,
  LiveProviderTransport,
  LiveProviderTransportResult,
  ProviderClientConfig,
  ProviderSecretRef,
  ConcreteProviderRequestPayload,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const KEY = "AURORA_PROVIDER_CREDENTIAL";
const SECRET = "test-secret-value-123"; // NOT a real key; >= minLength; no control chars
const CONFIG: ProviderClientConfig = { providerKind: "live" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:live" };

function resolver(source: EnvironmentCredentialSource, keyName = KEY): EnvironmentProviderCredentialResolver {
  return new EnvironmentProviderCredentialResolver({ keyName, source });
}

// --- classification -------------------------------------------------------------------------------

// Test 1 — a missing/blank/whitespace configured key name fails closed (invalid configuration).
test("a missing or whitespace key name fails closed (invalid)", () => {
  assert.equal(resolver({ [KEY]: SECRET }, "").resolve().status, "invalid");
  assert.equal(resolver({ [KEY]: SECRET }, "   ").resolve().status, "invalid");
  assert.equal(resolver({ " AURORA ": SECRET }, " AURORA ").resolve().status, "invalid");
});

// Test 2 — reads ONLY the explicitly configured key (an unrelated key is ignored).
test("the resolver reads only the configured key", () => {
  const res = resolver({ SOME_OTHER_KEY: SECRET }).resolve();
  assert.equal(res.status, "missing", "an unrelated key must not satisfy the configured lookup");
});

// Test 3 — absent key → missing.
test("an absent key maps to missing", () => {
  assert.equal(resolver({}).resolve().status, "missing");
});

// Test 4 — blank / whitespace value → invalid.
test("a blank or whitespace value maps to invalid", () => {
  assert.equal(resolver({ [KEY]: "" }).resolve().status, "invalid");
  assert.equal(resolver({ [KEY]: "   " }).resolve().status, "invalid");
});

// Test 5 — control characters / line breaks → invalid.
test("a value with control characters maps to invalid", () => {
  const withNewline = "abcdef" + String.fromCharCode(10) + "ghij";
  const withTab = "abcdef" + String.fromCharCode(9) + "ghij";
  assert.equal(resolver({ [KEY]: withNewline }).resolve().status, "invalid");
  assert.equal(resolver({ [KEY]: withTab }).resolve().status, "invalid");
});

// Test 6 — too-short value → invalid (default minLength).
test("a too-short value maps to invalid", () => {
  assert.equal(resolver({ [KEY]: "short" }).resolve().status, "invalid");
});

// Test 7 — a valid value → available with an opaque token.
test("a valid value resolves to available with a token", () => {
  const res = resolver({ [KEY]: SECRET }).resolve();
  assert.equal(res.status, "available");
  if (res.status === "available") assert.ok(typeof res.token === "string" && res.token.length > 0);
});

// Test 8 — failure resolutions carry no token and leak no secret.
test("failure resolutions carry no token and leak no secret", () => {
  for (const source of [{}, { [KEY]: "" }, { [KEY]: "short" }] as const) {
    const res = resolver(source).resolve();
    assert.equal("token" in res, false);
    assert.equal(JSON.stringify(res).includes(SECRET), false);
  }
});

// --- integration (availability is NOT live-call enablement) --------------------------------------

function spyTransport(): { transport: LiveProviderTransport; calls: () => number } {
  let n = 0;
  return {
    transport: {
      async send(): Promise<LiveProviderTransportResult> {
        n += 1;
        return { outcome: "response", body: { choices: [{ text: "should never be used" }] } };
      },
    },
    calls: () => n,
  };
}
const safeTransport: LiveProviderTransport = {
  async send(payload: ConcreteProviderRequestPayload) {
    return { outcome: "response", body: { choices: [{ text: `Reflecting on what we have: ${payload.allowedClaims.join("; ")}. This may be incomplete.` }] } };
  },
};

// Test 10 — credential available but policy disabled → no transport call.
test("an available credential does not enable a live call when the policy is disabled", async () => {
  const spy = spyTransport();
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.disabled(), resolver: resolver({ [KEY]: SECRET }), transport: spy.transport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(spy.calls(), 0, "transport must not be called when the policy is disabled");
});

// Test 11 — credential missing but policy enabled → no transport call, safe failure.
test("a missing credential prevents transport even when the policy is enabled", async () => {
  const spy = spyTransport();
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver: resolver({}), transport: spy.transport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(spy.calls(), 0, "transport must not be called when the credential is missing");
});

// Test 7/9 (integration) — available + enabled → rendered via validateDraft; the secret never leaks downstream.
test("an available credential renders via the validator and never leaks the secret", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver: resolver({ [KEY]: SECRET }), transport: safeTransport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "rendered");
  assert.equal(JSON.stringify(out).includes(SECRET), false, "outcome must not leak the secret");

  const rec = auditProviderAttempt({
    request: req(supportRenderable()), outcome: out, providerAdapterKind: "live",
    requestedAt: timestamp("2026-06-01T10:00:00.000Z"), completedAt: timestamp("2026-06-01T10:00:01.000Z"), createdAt: timestamp("2026-06-01T10:00:02.000Z"),
  });
  assert.equal(rec.draftSummary.rawDraftRetained, false);
  assert.equal(JSON.stringify(rec.toState()).includes(SECRET), false, "audit must not retain the secret");
});

// Implementation 023 — the process-environment adapter reads EXACTLY ONE configured key (once) from an INJECTED
// accessor and produces the existing EnvironmentCredentialSource shape; it does NOT classify the value
// (EnvironmentProviderCredentialResolver still does), does NOT enable live calls, and never leaks the raw secret.
// Default tests use a fake accessor — no real environment, no live call. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ProcessEnvironmentCredentialSourceAdapter,
  APPROVED_PROVIDER_CREDENTIAL_KEY,
  EnvironmentProviderCredentialResolver,
  LiveProviderClient,
  LiveCallPolicy,
  requestRealProviderRendering,
  auditProviderAttempt,
} from "../index.ts";
import type {
  ProcessEnvironmentAccessor,
  LiveProviderTransport,
  LiveProviderTransportResult,
  ProviderClientConfig,
  ProviderSecretRef,
  ConcreteProviderRequestPayload,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const KEY = APPROVED_PROVIDER_CREDENTIAL_KEY;
const SECRET = "test-secret-value-123"; // NOT a real key; >= resolver minLength; no control chars
const CONFIG: ProviderClientConfig = { providerKind: "live" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:live" };

function trackingAccessor(map: Readonly<Record<string, string | undefined>>): {
  readonly fn: ProcessEnvironmentAccessor;
  readonly keys: () => readonly string[];
} {
  const keys: string[] = [];
  return { fn: (k) => { keys.push(k); return map[k]; }, keys: () => keys };
}

// Tests 1 + 2 + 4 — reads only the approved key, exactly once, returning a source with only that key.
test("the adapter reads only the approved key, exactly once", () => {
  const acc = trackingAccessor({ [KEY]: SECRET, SOME_OTHER_KEY: "ignored" });
  const source = new ProcessEnvironmentCredentialSourceAdapter({ keyName: KEY, accessor: acc.fn }).toEnvironmentCredentialSource();
  assert.deepEqual(Object.keys(source), [KEY]);
  assert.equal(source[KEY], SECRET);
  assert.deepEqual(acc.keys(), [KEY], "the accessor must be called exactly once, with the configured key");
});

// Test 3 — a missing value returns an empty source.
test("a missing value returns an empty source", () => {
  const source = new ProcessEnvironmentCredentialSourceAdapter({ keyName: KEY, accessor: () => undefined }).toEnvironmentCredentialSource();
  assert.deepEqual(Object.keys(source), []);
});

// Test 5 — the adapter does NOT classify a blank/malformed value (it passes it through unjudged).
test("the adapter does not classify a blank value", () => {
  const source = new ProcessEnvironmentCredentialSourceAdapter({ keyName: KEY, accessor: () => "   " }).toEnvironmentCredentialSource();
  assert.equal(source[KEY], "   ", "the adapter passes the value through; it does not judge it");
});

// a blank/whitespace key name fails closed to an empty source.
test("a blank key name fails closed to an empty source", () => {
  const acc = trackingAccessor({ [KEY]: SECRET });
  const source = new ProcessEnvironmentCredentialSourceAdapter({ keyName: "  ", accessor: acc.fn }).toEnvironmentCredentialSource();
  assert.deepEqual(Object.keys(source), []);
  assert.deepEqual(acc.keys(), [], "no accessor call for an invalid key name");
});

// Test 6 — the resolver still classifies the adapter output (missing / invalid / available end-to-end).
test("the resolver still classifies the adapter output", () => {
  const resolverFor = (map: Readonly<Record<string, string | undefined>>) =>
    new EnvironmentProviderCredentialResolver({
      keyName: KEY,
      source: new ProcessEnvironmentCredentialSourceAdapter({ keyName: KEY, accessor: (k) => map[k] }).toEnvironmentCredentialSource(),
    });
  assert.equal(resolverFor({}).resolve().status, "missing");
  assert.equal(resolverFor({ [KEY]: "   " }).resolve().status, "invalid");
  assert.equal(resolverFor({ [KEY]: "short" }).resolve().status, "invalid");
  assert.equal(resolverFor({ [KEY]: SECRET }).resolve().status, "available");
});

// --- integration through the live client ---------------------------------------------------------
function spyTransport(): { transport: LiveProviderTransport; calls: () => number } {
  let n = 0;
  return {
    transport: { async send(): Promise<LiveProviderTransportResult> { n += 1; return { outcome: "response", body: { choices: [{ text: "x" }] } }; } },
    calls: () => n,
  };
}
const safeTransport: LiveProviderTransport = {
  async send(payload: ConcreteProviderRequestPayload) {
    return { outcome: "response", body: { choices: [{ text: `Reflecting on what we have: ${payload.allowedClaims.join("; ")}. This may be incomplete.` }] } };
  },
};
function resolverFromEnv(map: Readonly<Record<string, string | undefined>>): EnvironmentProviderCredentialResolver {
  return new EnvironmentProviderCredentialResolver({
    keyName: KEY,
    source: new ProcessEnvironmentCredentialSourceAdapter({ keyName: KEY, accessor: (k) => map[k] }).toEnvironmentCredentialSource(),
  });
}

// Tests 7 + 8 — availability does not enable a live call; a disabled policy still blocks the transport.
test("an adapter-provided credential does not enable a live call when the policy is disabled", async () => {
  const spy = spyTransport();
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.disabled(), resolver: resolverFromEnv({ [KEY]: SECRET }), transport: spy.transport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(spy.calls(), 0, "transport must not be called when the policy is disabled");
});

// Test 9 — a missing/invalid credential prevents transport even when the policy is enabled.
test("a missing adapter credential prevents transport even when the policy is enabled", async () => {
  const spy = spyTransport();
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver: resolverFromEnv({}), transport: spy.transport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(spy.calls(), 0, "transport must not be called when the credential is missing");
});

// Tests 11 + 12 — an available adapter credential renders via the validator; the secret never leaks downstream.
test("an available adapter credential renders via the validator and never leaks the secret", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver: resolverFromEnv({ [KEY]: SECRET }), transport: safeTransport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "rendered");
  assert.equal(JSON.stringify(out).includes(SECRET), false, "outcome must not leak the secret");

  const rec = auditProviderAttempt({
    request: req(supportRenderable()), outcome: out, providerAdapterKind: "live",
    requestedAt: timestamp("2026-07-01T10:00:00.000Z"), completedAt: timestamp("2026-07-01T10:00:01.000Z"), createdAt: timestamp("2026-07-01T10:00:02.000Z"),
  });
  assert.equal(rec.draftSummary.rawDraftRetained, false);
  assert.equal(JSON.stringify(rec.toState()).includes(SECRET), false, "audit must not retain the secret");
});

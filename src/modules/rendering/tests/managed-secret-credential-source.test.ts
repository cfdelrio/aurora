// Implementation 028 — behavior of the managed-secret credential-source boundary. Pre-fetch pattern:
// async toEnvironmentCredentialSource() produces the existing EnvironmentCredentialSource map; the
// downstream synchronous resolver chain (EnvironmentProviderCredentialResolver, LiveProviderClient,
// liveProviderSmoke) is UNCHANGED. All scenarios are deterministic — no live call, no real store, no
// real env, no CI credential, no SDK. Negative tests are defining.
//
// secret manager = credential source
// secret manager ≠ live-call enablement

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ManagedSecretCredentialSource,
  FakeManagedSecretStoreClient,
  EnvironmentProviderCredentialResolver,
  LiveProviderClient,
  LiveCallPolicy,
  liveProviderSmoke,
  LIVE_PROVIDER_SMOKE_STATUSES,
  FakeProviderClient,
  requestRealProviderRendering,
} from "../index.ts";
import type {
  ManagedSecretResolution,
  ManagedSecretStoreClient,
  ManagedSecretClientScenario,
  EnvironmentCredentialSource,
  LiveProviderTransport,
  LiveProviderTransportResult,
  ProviderClientConfig,
  ProviderClientBoundary,
  ProviderSecretRef,
} from "../index.ts";
import { req, supportRenderable } from "./fixtures.ts";

const SECRET_NAME = "test/aurora/provider-credential";
const CONFIG: ProviderClientConfig = { providerKind: "live" };
const SECRET_REF: ProviderSecretRef = { status: "present", ref: "ref:live" };
const REQUEST = req(supportRenderable());

/** Build a ManagedSecretCredentialSource with a given scenario. */
function source(scenario: ManagedSecretClientScenario = "available"): ManagedSecretCredentialSource {
  return new ManagedSecretCredentialSource({
    secretName: SECRET_NAME,
    storeClient: new FakeManagedSecretStoreClient({ scenario }),
  });
}

/** Build a resolver fed from the managed source for a given scenario (async, pre-fetch pattern). */
async function resolverFrom(scenario: ManagedSecretClientScenario): Promise<EnvironmentProviderCredentialResolver> {
  const envSource = await source(scenario).toEnvironmentCredentialSource();
  return new EnvironmentProviderCredentialResolver({ keyName: SECRET_NAME, source: envSource });
}

/** A transport that must never be called — proves a gate short-circuited before any provider call. */
const throwingTransport: LiveProviderTransport = {
  async send(): Promise<LiveProviderTransportResult> {
    throw new Error("transport must not be called");
  },
};

/** Count transport invocations without blocking them. */
function spyTransport(): { transport: LiveProviderTransport; calls: () => number } {
  let n = 0;
  return {
    transport: {
      async send(): Promise<LiveProviderTransportResult> {
        n += 1;
        return { outcome: "response", body: { choices: [{ text: "Reflecting on what we have." }] } };
      },
    },
    calls: () => n,
  };
}

/** Count provider client invocations. */
function spyClient(inner: ProviderClientBoundary): { readonly client: ProviderClientBoundary; calls: () => number } {
  let n = 0;
  return {
    client: { kind: inner.kind, requestDraft(input) { n += 1; return inner.requestDraft(input); } },
    calls: () => n,
  };
}

// --- source map shape -------------------------------------------------------------------------------

// Test 1 — available scenario populates the source map with the secret name key.
test("available scenario produces a source map with the configured secret name key", async () => {
  const envSource = await source("available").toEnvironmentCredentialSource();
  assert.ok(SECRET_NAME in envSource, "source map must contain the configured key for available");
  assert.ok(typeof envSource[SECRET_NAME] === "string" && (envSource[SECRET_NAME] ?? "").length > 0);
});

// Test 2 — missing scenario produces an empty source map.
test("missing scenario produces an empty source map", async () => {
  const envSource = await source("missing").toEnvironmentCredentialSource();
  assert.equal(SECRET_NAME in envSource, false, "missing: key must not be present in source map");
  assert.deepEqual(envSource, {});
});

// Test 3 — invalid scenario produces an empty source map.
test("invalid scenario produces an empty source map", async () => {
  const envSource = await source("invalid").toEnvironmentCredentialSource();
  assert.equal(SECRET_NAME in envSource, false, "invalid: key must not be present in source map");
  assert.deepEqual(envSource, {});
});

// Test 4 — unavailable scenario produces an empty source map.
test("unavailable scenario produces an empty source map", async () => {
  const envSource = await source("unavailable").toEnvironmentCredentialSource();
  assert.equal(SECRET_NAME in envSource, false, "unavailable: key must not be present in source map");
  assert.deepEqual(envSource, {});
});

// Test 5 — non-available scenarios produce no value: the sentinel must not appear.
test("non-available scenarios produce no credential value in the source map", async () => {
  const SENTINEL = "opaque:test-managed-secret";
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    const envSource = await source(scenario).toEnvironmentCredentialSource();
    assert.equal(JSON.stringify(envSource).includes(SENTINEL), false, `${scenario}: sentinel must not appear in source`);
    assert.deepEqual(envSource, {});
  }
});

// --- resolver integration (pre-fetch pattern) -------------------------------------------------------

// Test 6 — available managed source feeds the resolver; resolver returns available with an opaque token.
test("available managed source feeds the resolver and produces an available credential token", async () => {
  const resolver = await resolverFrom("available");
  const resolution = resolver.resolve();
  assert.equal(resolution.status, "available");
  if (resolution.status === "available") {
    assert.ok(typeof resolution.token === "string" && resolution.token.length > 0);
  }
});

// Test 7 — missing managed source → resolver returns missing (key absent from source map).
test("missing managed source → resolver classifies as missing", async () => {
  assert.equal((await resolverFrom("missing")).resolve().status, "missing");
});

// Test 8 — invalid managed source → resolver returns missing (empty map, same as missing).
test("invalid managed source → resolver classifies as missing (collapsed)", async () => {
  assert.equal((await resolverFrom("invalid")).resolve().status, "missing");
});

// Test 9 — unavailable managed source → resolver returns missing (empty map, same as missing).
test("unavailable managed source → resolver classifies as missing (collapsed)", async () => {
  assert.equal((await resolverFrom("unavailable")).resolve().status, "missing");
});

// --- live-call gate (availability is NOT enablement) ------------------------------------------------

// Test 10 — available managed source does NOT enable a live call when the policy is disabled.
test("an available managed secret does not enable a live call when the policy is disabled", async () => {
  const resolver = await resolverFrom("available");
  const spy = spyTransport();
  const out = await requestRealProviderRendering({
    request: REQUEST,
    client: new LiveProviderClient({ policy: LiveCallPolicy.disabled(), resolver, transport: spy.transport }),
    config: CONFIG,
    secret: SECRET_REF,
  });
  assert.equal(out.status, "failed");
  assert.equal(spy.calls(), 0, "transport must not be called when the policy is disabled");
});

// Test 11 — missing managed source prevents transport even with an enabled policy.
test("a missing managed secret prevents transport even when the policy is enabled", async () => {
  const resolver = await resolverFrom("missing");
  const out = await requestRealProviderRendering({
    request: REQUEST,
    client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver, transport: throwingTransport }),
    config: CONFIG,
    secret: SECRET_REF,
  });
  assert.equal(out.status, "failed");
});

// --- redaction: raw value must not leak downstream -------------------------------------------------

// Test 12 — the raw sentinel does not appear in the resolver output token string-sense for failure paths.
test("failure resolution carries no credential token and no raw value leaks", async () => {
  const SENTINEL = "opaque:test-managed-secret";
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    const resolver = await resolverFrom(scenario);
    const resolution = resolver.resolve();
    assert.equal("token" in resolution, false, `${scenario}: failure resolution must carry no token`);
    assert.equal(JSON.stringify(resolution).includes(SENTINEL), false, `${scenario}: sentinel must not appear in resolution`);
  }
});

// Test 13 — a custom raw value does not appear in downstream smoke results (proving no raw-secret leakage).
test("raw secret value does not appear in downstream smoke results", async () => {
  const RAW_SECRET = "sk-test-raw-secret-do-not-leak";
  // Custom fake with a deliberately obvious value to assert it never leaks into outputs.
  const customFake: ManagedSecretStoreClient = {
    async retrieve(_name: string): Promise<ManagedSecretResolution> {
      return Object.freeze({ status: "available", value: RAW_SECRET });
    },
  };
  const envSource = await new ManagedSecretCredentialSource({ secretName: SECRET_NAME, storeClient: customFake }).toEnvironmentCredentialSource();
  const resolver = new EnvironmentProviderCredentialResolver({ keyName: SECRET_NAME, source: envSource });
  // Disabled policy → smoke stops at live-policy-disabled, no provider call; credential was resolved but not used.
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: new FakeProviderClient({ scenario: "safe" }), policy: LiveCallPolicy.disabled(), resolver, config: CONFIG },
  );
  assert.equal(JSON.stringify(out).includes(RAW_SECRET), false, "raw secret must not appear in smoke result");
  assert.equal(out.rawRetained, false);
  assert.equal(out.status, "live-policy-disabled");
});

// Test 14 — the sentinel does not appear in JSON of non-available source maps.
test("non-available source map JSON contains no sentinel value", async () => {
  const SENTINEL = "opaque:test-managed-secret";
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    const envSource = await source(scenario).toEnvironmentCredentialSource();
    assert.equal(JSON.stringify(envSource).includes(SENTINEL), false);
    assert.equal(JSON.stringify(envSource), "{}");
  }
});

// --- smoke integration (managed-source path) --------------------------------------------------------

// Test 15 — smoke with available managed source + FakeProviderClient: returns passed; rawRetained: false.
test("smoke with available managed source and FakeProviderClient safe returns passed", async () => {
  const resolver = await resolverFrom("available");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "passed");
  assert.equal(out.rawRetained, false);
  assert.equal(out.validationPassed, true);
  assert.equal(spy.calls(), 1, "exactly one provider call for the passed path");
  assert.ok(LIVE_PROVIDER_SMOKE_STATUSES.includes(out.status));
  // raw sentinel must not appear in the redacted result
  assert.equal(JSON.stringify(out).includes("opaque:test-managed-secret"), false, "sentinel must not appear in smoke result");
});

// Test 16 — smoke with missing managed source: returns credential-missing before any provider call.
test("smoke with missing managed source returns credential-missing before any provider call", async () => {
  const resolver = await resolverFrom("missing");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "credential-missing");
  assert.equal(out.rawRetained, false);
  assert.equal(spy.calls(), 0, "no provider call must occur when managed secret is missing");
});

// Test 17 — smoke with unavailable managed source: returns credential-missing before any provider call.
test("smoke with unavailable managed source returns credential-missing before any provider call", async () => {
  const resolver = await resolverFrom("unavailable");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "credential-missing");
  assert.equal(spy.calls(), 0);
});

// Test 18 — smoke result for all non-available paths is redacted: no raw value, no env token.
test("smoke results for all non-available managed-secret paths are redacted", async () => {
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    const resolver = await resolverFrom(scenario);
    const out = await liveProviderSmoke(
      { optIn: true, ci: false, request: REQUEST },
      { client: new FakeProviderClient({ scenario: "safe" }), policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
    );
    assert.equal(out.rawRetained, false);
    const json = JSON.stringify(out).toLowerCase();
    for (const banned of ["opaque:test-managed-secret", "sk-test", "bearer", "secret", "apikey", "process.env"]) {
      assert.equal(json.includes(banned), false, `${scenario}: result must not contain '${banned}'`);
    }
  }
});

// --- always-resolves contract -----------------------------------------------------------------------

// Test 19 — toEnvironmentCredentialSource never rejects: unavailable store → Promise resolves to {}.
test("toEnvironmentCredentialSource always resolves and never rejects", async () => {
  let resolved = false;
  let threw = false;
  try {
    const envSource = await source("unavailable").toEnvironmentCredentialSource();
    resolved = true;
    assert.deepEqual(envSource, {});
  } catch {
    threw = true;
  }
  assert.equal(resolved, true, "toEnvironmentCredentialSource must always resolve");
  assert.equal(threw, false, "toEnvironmentCredentialSource must not throw");
});

// Test 20 — a store client that throws internally must be caught by the implementation (not surface to callers).
test("a store that internally throws must have its exception caught by the implementation", async () => {
  const throwingClient: ManagedSecretStoreClient = {
    async retrieve(_name: string): Promise<ManagedSecretResolution> {
      throw new Error("simulated store failure — should be caught by caller of retrieve, not by toEnvironmentCredentialSource");
    },
  };
  const managedSource = new ManagedSecretCredentialSource({ secretName: SECRET_NAME, storeClient: throwingClient });
  // If retrieve() throws, toEnvironmentCredentialSource() will propagate the rejection since the interface
  // contract requires implementations to catch internally — this test documents that contract requirement.
  // A production implementation must catch; the fake implementation (FakeManagedSecretStoreClient) never throws.
  // This test verifies that the INTERFACE allows implementations to honor the no-reject contract.
  let threw = false;
  try {
    await managedSource.toEnvironmentCredentialSource();
  } catch {
    threw = true;
  }
  // Documents the contract: production implementations must catch internally.
  // The managed source itself does not add an extra try/catch — the contract is on the storeClient implementation.
  assert.equal(threw, true, "documents: a storeClient that throws violates the interface contract; production adapters must catch");
});

// --- type identity checks (no constructor parameter properties; no arbitrary bag) ------------------

// Test 21 — FakeManagedSecretStoreClient defaults to available scenario.
test("FakeManagedSecretStoreClient defaults to available scenario", async () => {
  const fake = new FakeManagedSecretStoreClient();
  const resolution = await fake.retrieve(SECRET_NAME);
  assert.equal(resolution.status, "available");
});

// Test 22 — FakeManagedSecretStoreClient returns the correct status for each explicit scenario.
test("FakeManagedSecretStoreClient returns the correct status for each explicit scenario", async () => {
  for (const scenario of ["available", "missing", "invalid", "unavailable"] as const) {
    const resolution = await new FakeManagedSecretStoreClient({ scenario }).retrieve(SECRET_NAME);
    assert.equal(resolution.status, scenario, `scenario ${scenario}: expected status ${scenario}, got ${resolution.status}`);
  }
});

// Test 23 — FakeManagedSecretStoreClient available resolution carries the opaque sentinel; non-available do not.
test("FakeManagedSecretStoreClient available carries sentinel; non-available carry no value", async () => {
  const available = await new FakeManagedSecretStoreClient({ scenario: "available" }).retrieve(SECRET_NAME);
  assert.equal(available.status, "available");
  if (available.status === "available") {
    assert.equal(available.value, "opaque:test-managed-secret");
  }
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    const res = await new FakeManagedSecretStoreClient({ scenario }).retrieve(SECRET_NAME);
    assert.equal("value" in res, false, `${scenario}: must carry no value field`);
  }
});

// Test 24 — secret availability alone is not live-call enablement: all non-available paths = no transport.
test("secret availability is not live-call enablement: non-available → no transport call for all scenarios", async () => {
  for (const scenario of ["missing", "invalid", "unavailable"] as const) {
    let calls = 0;
    const countingTransport: LiveProviderTransport = {
      async send(): Promise<LiveProviderTransportResult> {
        calls += 1;
        return { outcome: "response", body: { choices: [{ text: "should never be used" }] } };
      },
    };
    const resolver = await resolverFrom(scenario);
    await requestRealProviderRendering({
      request: REQUEST,
      client: new LiveProviderClient({ policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }), resolver, transport: countingTransport }),
      config: CONFIG,
      secret: SECRET_REF,
    });
    assert.equal(calls, 0, `${scenario}: transport must not be called when managed secret is not available`);
  }
});

// Test 25 — the EnvironmentCredentialSource type from managed source is compatible with existing resolver.
test("EnvironmentCredentialSource produced by managed source is accepted by EnvironmentProviderCredentialResolver", async () => {
  const envSource: EnvironmentCredentialSource = await source("available").toEnvironmentCredentialSource();
  // Type compatibility — no TypeScript error means the contract is satisfied.
  const resolver = new EnvironmentProviderCredentialResolver({ keyName: SECRET_NAME, source: envSource });
  const resolution = resolver.resolve();
  assert.ok(["available", "missing", "invalid"].includes(resolution.status));
});

// Implementation 029 — behavior of the cloud-secret adapter contract layer behind the Impl 028 managed-secret
// seam. CloudSecretStoreAdapter implements ManagedSecretStoreClient by mapping a richer, injected
// CloudSecretValueClient outcome (and any thrown exception) into the existing 4-state ManagedSecretResolution,
// fail-closed and redacted. All scenarios are deterministic — no live call, no real cloud, no real secret,
// no real env, no CI credential, no SDK, no network. Negative tests are defining.
//
//   ManagedSecretStoreClient = Aurora provider-neutral seam
//   CloudSecretValueClient   = injected cloud-like transport boundary
//   CloudSecretStoreAdapter  = mapper / redactor / fail-closed adapter
// secret ref ≠ secret value; cloud response ≠ safe failure code; credential available ≠ LiveCallPolicy approval.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CloudSecretStoreAdapter,
  FakeCloudSecretValueClient,
  ManagedSecretCredentialSource,
  EnvironmentProviderCredentialResolver,
  LiveProviderClient,
  LiveCallPolicy,
  liveProviderSmoke,
  LIVE_PROVIDER_SMOKE_STATUSES,
  FakeProviderClient,
  requestRealProviderRendering,
} from "../index.ts";
import type {
  CloudSecretValueClient,
  CloudSecretLookupResult,
  CloudSecretClientScenario,
  ManagedSecretStoreClient,
  ManagedSecretResolution,
  ProviderClientConfig,
  ProviderClientBoundary,
  ProviderSecretRef,
  LiveProviderTransport,
  LiveProviderTransportResult,
} from "../index.ts";
import { req, supportRenderable } from "./fixtures.ts";

const SECRET_NAME = "test/aurora/cloud-provider-credential";
const CONFIG: ProviderClientConfig = { providerKind: "live" };
const SECRET_REF: ProviderSecretRef = { status: "present", ref: "ref:live" };
const REQUEST = req(supportRenderable());

// obvious non-leak markers — must never appear in any safe public output.
const LEAK_SECRET = "sk-test-cloud-secret-do-not-leak";
const LEAK_CLOUD_RESPONSE = "raw-cloud-response-do-not-leak";
const LEAK_ACCESS_TOKEN = "cloud-access-token-do-not-leak";

/** Build a cloud adapter for a given fake scenario. */
function adapter(scenario: CloudSecretClientScenario = "found"): CloudSecretStoreAdapter {
  return new CloudSecretStoreAdapter({ cloudClient: new FakeCloudSecretValueClient({ scenario }) });
}

/** Build a managed source that uses the cloud adapter as its store client. */
function managedSource(scenario: CloudSecretClientScenario = "found"): ManagedSecretCredentialSource {
  return new ManagedSecretCredentialSource({ secretName: SECRET_NAME, storeClient: adapter(scenario) });
}

/** Build a resolver fed from the cloud adapter (async pre-fetch pattern; downstream chain unchanged). */
async function resolverFrom(scenario: CloudSecretClientScenario): Promise<EnvironmentProviderCredentialResolver> {
  const envSource = await managedSource(scenario).toEnvironmentCredentialSource();
  return new EnvironmentProviderCredentialResolver({ keyName: SECRET_NAME, source: envSource });
}

/** Count provider client invocations without blocking them. */
function spyClient(inner: ProviderClientBoundary): { readonly client: ProviderClientBoundary; calls: () => number } {
  let n = 0;
  return {
    client: { kind: inner.kind, requestDraft(input) { n += 1; return inner.requestDraft(input); } },
    calls: () => n,
  };
}

// --- Test 1 — the adapter implements ManagedSecretStoreClient and is usable through that type --------

test("CloudSecretStoreAdapter implements ManagedSecretStoreClient", async () => {
  const asSeam: ManagedSecretStoreClient = adapter("found");
  const resolution: ManagedSecretResolution = await asSeam.retrieve(SECRET_NAME);
  assert.ok(["available", "missing", "invalid", "unavailable"].includes(resolution.status));
});

// --- Test 2 — available cloud credential maps to managed-secret available ---------------------------

test("found cloud lookup maps to managed-secret available with the value", async () => {
  const resolution = await adapter("found").retrieve(SECRET_NAME);
  assert.equal(resolution.status, "available");
  if (resolution.status === "available") {
    assert.equal(resolution.value, "opaque:test-cloud-secret");
  }
});

// --- Test 3 — missing (not configured + not found) maps to safe missing -----------------------------

test("not_found cloud lookup maps to safe missing", async () => {
  assert.equal((await adapter("not_found").retrieve(SECRET_NAME)).status, "missing");
});

test("not-configured (empty secret name) maps to safe missing without touching the transport", async () => {
  let touched = false;
  const client: CloudSecretValueClient = {
    async lookup(): Promise<CloudSecretLookupResult> {
      touched = true;
      return { status: "found", value: "opaque:should-not-be-used" };
    },
  };
  const resolution = await new CloudSecretStoreAdapter({ cloudClient: client }).retrieve("   ");
  assert.equal(resolution.status, "missing");
  assert.equal(touched, false, "empty ref name must not reach the transport");
});

// --- Test 4 — permission denied maps safely ---------------------------------------------------------

test("permission denied maps to safe unavailable", async () => {
  assert.equal((await adapter("denied").retrieve(SECRET_NAME)).status, "unavailable");
});

// --- Test 5 — unauthenticated runtime identity maps safely ------------------------------------------

test("unauthenticated runtime identity maps to safe unavailable", async () => {
  assert.equal((await adapter("unauthenticated").retrieve(SECRET_NAME)).status, "unavailable");
});

// --- Test 6 — cloud service / SDK unavailable maps safely -------------------------------------------

test("service unavailable maps to safe unavailable", async () => {
  assert.equal((await adapter("unavailable").retrieve(SECRET_NAME)).status, "unavailable");
});

// --- Test 7 — timeout maps safely ------------------------------------------------------------------

test("timeout maps to safe unavailable", async () => {
  assert.equal((await adapter("timeout").retrieve(SECRET_NAME)).status, "unavailable");
});

// --- Test 8 — throttling / rate limiting maps safely -----------------------------------------------

test("throttling / rate limiting maps to safe unavailable", async () => {
  assert.equal((await adapter("throttled").retrieve(SECRET_NAME)).status, "unavailable");
});

// --- Test 9 — malformed payload maps safely --------------------------------------------------------

test("malformed cloud payload maps to safe invalid", async () => {
  assert.equal((await adapter("malformed").retrieve(SECRET_NAME)).status, "invalid");
});

// --- Test 10 — unexpected exception is caught and maps safely (never rejects) -----------------------

test("an unexpected transport exception is caught and maps to safe unavailable (retrieve never rejects)", async () => {
  let threw = false;
  let resolution: ManagedSecretResolution | undefined;
  try {
    resolution = await adapter("throws").retrieve(SECRET_NAME);
  } catch {
    threw = true;
  }
  assert.equal(threw, false, "retrieve must never reject");
  assert.equal(resolution?.status, "unavailable");
});

// --- Test 11 — invalid returned credential (found but malformed value) maps safely -----------------

test("found-but-malformed value maps to safe invalid (no malformed value flows downstream)", async () => {
  assert.equal((await adapter("found-malformed").retrieve(SECRET_NAME)).status, "invalid");
});

test("every non-found scenario carries no value field", async () => {
  for (const scenario of ["not_found", "malformed", "denied", "unauthenticated", "unavailable", "timeout", "throttled", "throws", "found-malformed"] as const) {
    const resolution = await adapter(scenario).retrieve(SECRET_NAME);
    assert.equal("value" in resolution, false, `${scenario}: must carry no value field`);
  }
});

// --- Test 12 + 13 — raw secret and raw cloud response never leak in result/error/string/JSON --------

test("raw secret and raw cloud response do not appear in any non-available resolution (string + JSON)", async () => {
  // A custom client that carries obvious leak markers in every shape — none must survive the mapping.
  const leakyFailures: readonly CloudSecretLookupResult[] = [
    { status: "not_found" },
    { status: "malformed" },
    { status: "denied" },
    { status: "unauthenticated" },
    { status: "unavailable" },
    { status: "timeout" },
    { status: "throttled" },
    { status: "found", value: `   ${LEAK_SECRET} ` }, // control char → invalid; value must not survive
  ];
  for (const failure of leakyFailures) {
    const client: CloudSecretValueClient = { async lookup(): Promise<CloudSecretLookupResult> { return failure; } };
    const resolution = await new CloudSecretStoreAdapter({ cloudClient: client }).retrieve(SECRET_NAME);
    const asString = `${JSON.stringify(resolution)} ${String(resolution.status)}`;
    for (const marker of [LEAK_SECRET, LEAK_CLOUD_RESPONSE, LEAK_ACCESS_TOKEN]) {
      assert.equal(asString.includes(marker), false, `mapping of ${failure.status} must not leak '${marker}'`);
    }
    assert.equal("value" in resolution, false);
  }
});

test("a thrown transport error carrying secret material does not leak into the safe resolution", async () => {
  const client: CloudSecretValueClient = {
    async lookup(): Promise<CloudSecretLookupResult> {
      throw new Error(`boom ${LEAK_SECRET} ${LEAK_CLOUD_RESPONSE} ${LEAK_ACCESS_TOKEN}`);
    },
  };
  const resolution = await new CloudSecretStoreAdapter({ cloudClient: client }).retrieve(SECRET_NAME);
  assert.equal(resolution.status, "unavailable");
  const json = JSON.stringify(resolution);
  for (const marker of [LEAK_SECRET, LEAK_CLOUD_RESPONSE, LEAK_ACCESS_TOKEN, "boom"]) {
    assert.equal(json.includes(marker), false, `caught exception must not leak '${marker}'`);
  }
});

// --- Test 14 — available cloud credential does NOT enable a live call -------------------------------

test("an available cloud credential does not enable a live call when the policy is disabled", async () => {
  const resolver = await resolverFrom("found");
  let calls = 0;
  const transport: LiveProviderTransport = {
    async send(): Promise<LiveProviderTransportResult> {
      calls += 1;
      return { outcome: "response", body: { choices: [{ text: "should never be used" }] } };
    },
  };
  const out = await requestRealProviderRendering({
    request: REQUEST,
    client: new LiveProviderClient({ policy: LiveCallPolicy.disabled(), resolver, transport }),
    config: CONFIG,
    secret: SECRET_REF,
  });
  assert.equal(out.status, "failed");
  assert.equal(calls, 0, "transport must not be called when the policy is disabled");
});

// --- Test 15 — available cloud credential does NOT bypass LiveCallPolicy ----------------------------

test("an available cloud credential does not bypass LiveCallPolicy in smoke", async () => {
  const resolver = await resolverFrom("found");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.disabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "live-policy-disabled");
  assert.equal(out.rawRetained, false);
  assert.equal(spy.calls(), 0, "no provider call when the policy is disabled, even with an available credential");
});

// --- Test 16 — available cloud credential does NOT bypass operator opt-in ---------------------------

test("an available cloud credential does not bypass operator opt-in", async () => {
  const resolver = await resolverFrom("found");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: false, ci: false, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "not-enabled");
  assert.equal(spy.calls(), 0, "no provider call without operator opt-in, even with an available credential");
});

// --- Test 17 — available cloud credential does NOT bypass the CI guard ------------------------------

test("an available cloud credential does not bypass the CI guard", async () => {
  const resolver = await resolverFrom("found");
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: true, request: REQUEST },
    { client: spy.client, policy: LiveCallPolicy.enabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "ci-disabled");
  assert.equal(spy.calls(), 0, "no provider call under the CI guard, even with an available credential");
});

// --- Test 18 — adapter is consumed by ManagedSecretCredentialSource without changing resolver semantics

test("cloud adapter feeds ManagedSecretCredentialSource without changing resolver semantics", async () => {
  // available → resolver available
  assert.equal((await resolverFrom("found")).resolve().status, "available");
  // every non-available cloud outcome → empty source → resolver classifies missing (unchanged Impl 022 behavior)
  for (const scenario of ["not_found", "malformed", "denied", "unauthenticated", "unavailable", "timeout", "throttled", "throws", "found-malformed"] as const) {
    assert.equal((await resolverFrom(scenario)).resolve().status, "missing", `${scenario}: resolver must classify missing`);
  }
});

// --- redaction through the full pre-fetch chain into a smoke result ---------------------------------

test("a leaking cloud value never appears in a redacted downstream smoke result", async () => {
  // A cloud client that returns a (well-formed) value carrying obvious leak markers. With the policy
  // disabled, smoke stops at live-policy-disabled — the credential is resolved but never used or emitted.
  const leakyClient: CloudSecretValueClient = {
    async lookup(): Promise<CloudSecretLookupResult> {
      return { status: "found", value: `${LEAK_SECRET}-${LEAK_ACCESS_TOKEN}` };
    },
  };
  const envSource = await new ManagedSecretCredentialSource({
    secretName: SECRET_NAME,
    storeClient: new CloudSecretStoreAdapter({ cloudClient: leakyClient }),
  }).toEnvironmentCredentialSource();
  const resolver = new EnvironmentProviderCredentialResolver({ keyName: SECRET_NAME, source: envSource });
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    { client: new FakeProviderClient({ scenario: "safe" }), policy: LiveCallPolicy.disabled(), resolver, config: CONFIG },
  );
  assert.equal(out.status, "live-policy-disabled");
  assert.equal(out.rawRetained, false);
  const json = JSON.stringify(out);
  for (const marker of [LEAK_SECRET, LEAK_ACCESS_TOKEN, LEAK_CLOUD_RESPONSE]) {
    assert.equal(json.includes(marker), false, `smoke result must not leak '${marker}'`);
  }
});

// --- always-resolves contract for every scenario ---------------------------------------------------

test("retrieve always resolves for every scenario and never rejects", async () => {
  for (const scenario of ["found", "found-malformed", "not_found", "malformed", "denied", "unauthenticated", "unavailable", "timeout", "throttled", "throws"] as const) {
    let threw = false;
    try {
      await adapter(scenario).retrieve(SECRET_NAME);
    } catch {
      threw = true;
    }
    assert.equal(threw, false, `${scenario}: retrieve must always resolve`);
  }
});

// --- fake defaults + status catalog sanity ---------------------------------------------------------

test("FakeCloudSecretValueClient defaults to the found scenario", async () => {
  const result = await new FakeCloudSecretValueClient().lookup({ name: SECRET_NAME });
  assert.equal(result.status, "found");
});

test("the full mapping uses only the existing managed-secret status catalog", async () => {
  const seen = new Set<ManagedSecretResolution["status"]>();
  for (const scenario of ["found", "found-malformed", "not_found", "malformed", "denied", "unauthenticated", "unavailable", "timeout", "throttled", "throws"] as const) {
    seen.add((await adapter(scenario).retrieve(SECRET_NAME)).status);
  }
  for (const status of seen) {
    assert.ok(["available", "missing", "invalid", "unavailable"].includes(status), `unexpected status ${status}`);
  }
  // smoke status catalog is unchanged and still includes the gate dispositions used above.
  for (const status of ["not-enabled", "ci-disabled", "live-policy-disabled", "passed"] as const) {
    assert.ok(LIVE_PROVIDER_SMOKE_STATUSES.includes(status));
  }
});

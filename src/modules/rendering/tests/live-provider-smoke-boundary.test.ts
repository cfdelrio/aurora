// Implementation 026 — behavior of the opt-in live-provider smoke boundary. Deterministic, fakes only, NO live
// call, NO real environment, NO CI credential. The explicit fail-closed gates (opt-in -> CI -> credential ->
// live policy) each stop BEFORE any provider call; only then is ONE provider call made through the existing
// requestRealProviderRendering -> validateDraft seam. The result is closed + redacted. Negative checks are
// defining: every assertion confirms a stop-before-call, a redacted result, or a single bounded call.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  liveProviderSmoke,
  LIVE_PROVIDER_SMOKE_STATUSES,
  FakeProviderClient,
  LiveCallPolicy,
  StaticProviderCredentialResolver,
} from "../index.ts";
import type {
  LiveProviderSmokeDependencies,
  LiveProviderSmokeResult,
  ProviderClientBoundary,
  ProviderClientConfig,
  ProviderCredentialResolver,
  ProviderCredentialResolution,
  FakeProviderClientScenario,
} from "../index.ts";
import { req, supportRenderable } from "./fixtures.ts";

const CONFIG: ProviderClientConfig = { providerKind: "live" };
const REQUEST = req(supportRenderable());

/** A resolver that must never be reached (proves the opt-in / CI gates short-circuit before credential resolution). */
const throwingResolver: ProviderCredentialResolver = {
  resolve(): ProviderCredentialResolution {
    throw new Error("resolver must not be called before opt-in/CI gates pass");
  },
};

/** Wrap a client to count how many times the provider call is reached. */
function spyClient(inner: ProviderClientBoundary): { readonly client: ProviderClientBoundary; calls: () => number } {
  let n = 0;
  const client: ProviderClientBoundary = {
    kind: inner.kind,
    requestDraft(input) {
      n += 1;
      return inner.requestDraft(input);
    },
  };
  return { client, calls: () => n };
}

/** Default deps: available credential, enabled policy, safe fake client — overridable per test. */
function deps(over: Partial<LiveProviderSmokeDependencies> = {}): LiveProviderSmokeDependencies {
  return {
    client: new FakeProviderClient({ scenario: "safe" }),
    policy: LiveCallPolicy.enabled(),
    resolver: new StaticProviderCredentialResolver({ status: "available" }),
    config: CONFIG,
    ...over,
  };
}

/** Every result must carry a known status, rawRetained:false, and NO raw draft/prompt/payload/secret/env/body. */
function assertRedactedAndKnown(r: LiveProviderSmokeResult): void {
  assert.ok(LIVE_PROVIDER_SMOKE_STATUSES.includes(r.status), `unknown status ${r.status}`);
  assert.equal(r.rawRetained, false);
  const json = JSON.stringify(r).toLowerCase();
  for (const banned of [
    "energy felt low", // the renderable / rendered-message body must never enter the result
    "reflecting on what we have", // the safe fake draft body
    "you should", // the unsafe (escalating) draft body
    "ref:live", // the operational secret ref must never enter the result
    "opaque:", // the credential token sentinel must never enter the result
    "bearer",
    "authorization",
    "apikey",
    "secret",
    "process" + ".env",
  ]) {
    assert.equal(json.includes(banned), false, `result must not contain '${banned}'`);
  }
}

// --- fail-closed gates: each stops BEFORE any provider call ----------------------------------------

test("no opt-in returns not-enabled before credential resolution and any provider call", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: false, ci: false, request: REQUEST },
    deps({ client: spy.client, resolver: throwingResolver }),
  );
  assert.equal(out.status, "not-enabled");
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

test("opt-in is the first fail-closed gate: optIn=false dominates CI / missing credential / disabled policy", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: false, ci: true, request: REQUEST },
    deps({ client: spy.client, resolver: throwingResolver, policy: LiveCallPolicy.disabled() }),
  );
  assert.equal(out.status, "not-enabled"); // not ci-disabled — opt-in is checked first
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

test("CI indicator returns ci-disabled before credential resolution and any provider call", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: true, request: REQUEST },
    deps({ client: spy.client, resolver: throwingResolver }),
  );
  assert.equal(out.status, "ci-disabled");
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

test("missing credential stops before any provider call", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    deps({ client: spy.client, resolver: new StaticProviderCredentialResolver({ status: "missing" }) }),
  );
  assert.equal(out.status, "credential-missing");
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

test("invalid credential stops before any provider call", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    deps({ client: spy.client, resolver: new StaticProviderCredentialResolver({ status: "invalid" }) }),
  );
  assert.equal(out.status, "credential-invalid");
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

test("disabled live policy stops before any provider call", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    deps({ client: spy.client, policy: LiveCallPolicy.disabled() }),
  );
  assert.equal(out.status, "live-policy-disabled");
  assert.equal(spy.calls(), 0);
  assertRedactedAndKnown(out);
});

// --- the single provider call through the existing seam --------------------------------------------

test("provider failure returns provider-failed with a safe code and makes exactly one call (no re-issue)", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "unavailable" }));
  const out = await liveProviderSmoke({ optIn: true, ci: false, request: REQUEST }, deps({ client: spy.client }));
  assert.equal(out.status, "provider-failed");
  assert.equal(typeof out.providerFailureCode, "string");
  assert.ok((out.providerFailureCode ?? "").length > 0);
  assert.equal(spy.calls(), 1);
  assertRedactedAndKnown(out);
});

test("malformed provider response maps to a safe provider-failed (granularity collapsed, no raw body)", async () => {
  const out = await liveProviderSmoke(
    { optIn: true, ci: false, request: REQUEST },
    deps({ client: new FakeProviderClient({ scenario: "malformed" }) }),
  );
  assert.equal(out.status, "provider-failed");
  assertRedactedAndKnown(out);
});

test("a provider draft that fails validateDraft returns validation-failed and is not accepted", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "voice-escalating" }));
  const out = await liveProviderSmoke({ optIn: true, ci: false, request: REQUEST }, deps({ client: spy.client }));
  assert.equal(out.status, "validation-failed");
  assert.equal(out.validationPassed, false);
  assert.equal(spy.calls(), 1);
  assertRedactedAndKnown(out);
});

test("a provider draft that passes validateDraft returns passed (wiring OK) — no evidence/delivery/body", async () => {
  const spy = spyClient(new FakeProviderClient({ scenario: "safe" }));
  const out = await liveProviderSmoke({ optIn: true, ci: false, request: REQUEST }, deps({ client: spy.client }));
  assert.equal(out.status, "passed");
  assert.equal(out.validationPassed, true);
  assert.equal(spy.calls(), 1);
  // the rendered-message body must NOT appear in the wiring result
  assert.equal(JSON.stringify(out).toLowerCase().includes("energy felt low"), false);
  assertRedactedAndKnown(out);
});

// --- redaction across all paths + safe deterministic duration -------------------------------------

test("redacted output on every path: no raw draft/prompt/payload/response/secret/env value/rendered body", async () => {
  const scenarios: readonly FakeProviderClientScenario[] = ["safe", "voice-escalating", "unavailable", "malformed"];
  for (const scenario of scenarios) {
    const out = await liveProviderSmoke(
      { optIn: true, ci: false, request: REQUEST },
      deps({ client: new FakeProviderClient({ scenario }) }),
    );
    assertRedactedAndKnown(out);
  }
});

test("duration is deterministic when a clock is injected", async () => {
  let t = 1000;
  const now = (): number => {
    const v = t;
    t += 42; // start 1000 -> end 1042 -> 42ms
    return v;
  };
  const out = await liveProviderSmoke({ optIn: true, ci: false, request: REQUEST }, deps({ now }));
  assert.equal(out.status, "passed");
  assert.equal(out.durationMs, 42);
  assertRedactedAndKnown(out);
});

test("duration is omitted when no clock is injected", async () => {
  const out = await liveProviderSmoke({ optIn: true, ci: false, request: REQUEST }, deps());
  assert.equal(out.status, "passed");
  assert.equal(out.durationMs, undefined);
  assertRedactedAndKnown(out);
});

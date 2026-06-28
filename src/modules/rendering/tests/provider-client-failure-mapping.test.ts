// Implementation 019 — operational failure mapping: every ProviderOperationalFailure maps DOWN to the
// existing closed ProviderFailure (no expansion); credential failures fail safely BEFORE any client call;
// no automatic retry. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FakeProviderClient,
  requestRealProviderRendering,
  toProviderFailure,
  PROVIDER_OPERATIONAL_FAILURES,
  PROVIDER_FAILURES,
  isProviderFailure,
} from "../index.ts";
import type {
  FakeProviderClientScenario,
  ProviderClientBoundary,
  ProviderClientConfig,
  ProviderClientRequest,
  ProviderClientResponse,
  ProviderSecretRef,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";

const CONFIG: ProviderClientConfig = { providerKind: "fake" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:fake" };

// toProviderFailure maps every operational reason to a real, closed ProviderFailure.
test("toProviderFailure maps every ProviderOperationalFailure to a real ProviderFailure", () => {
  for (const op of PROVIDER_OPERATIONAL_FAILURES) {
    const mapped = toProviderFailure(op);
    assert.ok(isProviderFailure(mapped), `${op} -> ${mapped} must be a real ProviderFailure`);
  }
  assert.equal(toProviderFailure("missing-credential"), "provider-unavailable");
  assert.equal(toProviderFailure("invalid-credential"), "provider-unavailable");
  assert.equal(toProviderFailure("unsupported-provider-config"), "provider-unavailable");
  assert.equal(toProviderFailure("provider-timeout"), "provider-timeout");
  assert.equal(toProviderFailure("provider-rate-limited"), "provider-rate-limited");
  assert.equal(toProviderFailure("provider-refused"), "provider-refused");
  assert.equal(toProviderFailure("provider-returned-empty-response"), "provider-returned-empty-draft");
  assert.equal(toProviderFailure("provider-returned-malformed-response"), "provider-returned-invalid-draft");
  assert.equal(toProviderFailure("unsafe-provider-request"), "unsafe-provider-request");
});

// `ProviderFailure` is not expanded by this slice.
test("the ProviderFailure catalog was not expanded", () => {
  assert.equal(PROVIDER_FAILURES.length, 10);
});

// client failure scenarios degrade to safe non-rendering with the mapped reason.
test("client failure scenarios map to safe non-rendering", async () => {
  const cases: ReadonlyArray<readonly [FakeProviderClientScenario, string]> = [
    ["timeout", "provider-timeout"],
    ["rate-limited", "provider-rate-limited"],
    ["refused", "provider-refused"],
    ["unavailable", "provider-unavailable"],
    ["empty", "provider-returned-empty-draft"],
    ["malformed", "provider-returned-invalid-draft"],
  ];
  for (const [scenario, expected] of cases) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()),
      client: new FakeProviderClient({ scenario }),
      config: CONFIG,
      secret: PRESENT,
    });
    assert.equal(out.status, "failed");
    if (out.status !== "failed") continue;
    assert.equal(out.failure, expected);
    assert.equal(out.renderingFailures, undefined); // not a validation failure
  }
});

// missing / invalid credential fails safely BEFORE any client call.
test("missing / invalid credential fails safely before the client is called", async () => {
  let calls = 0;
  const spy: ProviderClientBoundary = {
    kind: "spy",
    requestDraft(_input: ProviderClientRequest): Promise<ProviderClientResponse> {
      calls += 1;
      throw new Error("client must not be called when credential is not present");
    },
  };
  for (const status of ["missing", "invalid"] as const) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()),
      client: spy,
      config: CONFIG,
      secret: { status },
    });
    assert.equal(out.status, "failed");
    if (out.status === "failed") assert.equal(out.failure, "provider-unavailable");
  }
  assert.equal(calls, 0, "the client must never be called for a non-present credential");
});

// no automatic retry: the client is called at most once per request.
test("the client is called exactly once for a present credential (no automatic retry)", async () => {
  let calls = 0;
  const counting: ProviderClientBoundary = {
    kind: "counting",
    requestDraft(_input: ProviderClientRequest): Promise<ProviderClientResponse> {
      calls += 1;
      return Promise.resolve(Object.freeze({ status: "failed", failure: "provider-timeout" }));
    },
  };
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: counting,
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(calls, 1, "no automatic retry — exactly one client call");
});

// Implementation 021 — live transport conditions map DOWN onto the EXISTING failure surfaces
// (ProviderOperationalFailure → ProviderFailure), with no catalog expansion. Every transport error/edge
// degrades to safe non-rendering; unknown errors fail safe and leak nothing. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LiveProviderClient,
  LiveCallPolicy,
  StaticProviderCredentialResolver,
  requestRealProviderRendering,
} from "../index.ts";
import type {
  LiveProviderTransport,
  LiveProviderTransportResult,
  ProviderClientRequest,
  ProviderClientConfig,
  ProviderSecretRef,
  ProviderOperationalFailure,
  ProviderFailure,
  ConcreteProviderErrorKind,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { providerInstructionFrom, providerRenderingRequestFrom } from "../index.ts";

const CONFIG: ProviderClientConfig = { providerKind: "live" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:live" };

function clientWith(transport: LiveProviderTransport): LiveProviderClient {
  return new LiveProviderClient({
    policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }),
    resolver: new StaticProviderCredentialResolver({ status: "available" }),
    transport,
  });
}
function errorTransport(kind: ConcreteProviderErrorKind): LiveProviderTransport {
  return { async send(): Promise<LiveProviderTransportResult> { return { outcome: "error", error: { kind } }; } };
}
function bodyTransport(body: unknown): LiveProviderTransport {
  return { async send(): Promise<LiveProviderTransportResult> { return { outcome: "response", body }; } };
}
function clientRequest(): ProviderClientRequest {
  const built = providerRenderingRequestFrom(req(supportRenderable()));
  if (built.status === "rejected") throw new Error("fixture must be safe");
  return { sourceCaseRef: "case:1", instruction: providerInstructionFrom(built.providerRequest), config: CONFIG, secret: PRESENT };
}

// Tests 6-10 (client level) — transport errors / edges map to the existing operational failures.
test("transport conditions map to the existing ProviderOperationalFailure", async () => {
  const cases: ReadonlyArray<readonly [ConcreteProviderErrorKind, ProviderOperationalFailure]> = [
    ["timeout", "provider-timeout"],
    ["rate-limit", "provider-rate-limited"],
    ["network-unavailable", "provider-unavailable"],
    ["invalid-credential", "invalid-credential"],
    ["missing-credential", "missing-credential"],
    ["refusal", "provider-refused"],
    ["malformed-response", "provider-returned-malformed-response"],
    ["empty-response", "provider-returned-empty-response"],
    ["unsupported-config", "unsupported-provider-config"],
    ["unknown", "provider-unavailable"],
    ["live-disabled", "provider-unavailable"],
  ];
  for (const [kind, expected] of cases) {
    const res = await clientWith(errorTransport(kind)).requestDraft(clientRequest());
    assert.equal(res.status === "failed" && res.failure, expected, `transport '${kind}' must map to '${expected}'`);
  }
});

// empty / malformed response BODIES map via the parser to safe operational failures.
test("empty and malformed response bodies map to safe operational failures", async () => {
  const empty = await clientWith(bodyTransport({ choices: [{ text: "   " }] })).requestDraft(clientRequest());
  assert.equal(empty.status === "failed" && empty.failure, "provider-returned-empty-response");
  for (const bad of [null, {}, { choices: [] }, { choices: [{}] }]) {
    const res = await clientWith(bodyTransport(bad)).requestDraft(clientRequest());
    assert.equal(res.status === "failed" && res.failure, "provider-returned-malformed-response", `body ${JSON.stringify(bad)}`);
  }
});

// Tests 6-10 (service level) — the failures surface as the existing ProviderFailure via toProviderFailure.
test("transport failures surface as the existing ProviderFailure through the service", async () => {
  const cases: ReadonlyArray<readonly [ConcreteProviderErrorKind, ProviderFailure]> = [
    ["timeout", "provider-timeout"],
    ["rate-limit", "provider-rate-limited"],
    ["network-unavailable", "provider-unavailable"],
    ["refusal", "provider-refused"],
    ["malformed-response", "provider-returned-invalid-draft"],
    ["empty-response", "provider-returned-empty-draft"],
    ["unknown", "provider-unavailable"],
  ];
  for (const [kind, expected] of cases) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()), client: clientWith(errorTransport(kind)), config: CONFIG, secret: PRESENT,
    });
    assert.equal(out.status, "failed");
    if (out.status === "failed") assert.equal(out.failure, expected, `'${kind}' → '${expected}'`);
  }
});

// an unknown transport error leaks no payload/secret in the failure surface.
test("an unknown transport error fails safe and leaks nothing", async () => {
  const res = await clientWith(errorTransport("unknown")).requestDraft(clientRequest());
  assert.equal(res.status === "failed" && res.failure, "provider-unavailable");
  assert.equal(JSON.stringify(res).toLowerCase().includes("secret"), false);
});

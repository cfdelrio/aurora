// Implementation 021 — the live-call gate is fail-closed and deterministic. Live calls are disabled by
// default; a disabled policy or a missing/invalid credential fails safely BEFORE any transport call; a safe
// live draft becomes a RenderedMessage ONLY via the unchanged validateDraft; secrets never leak. The default
// suite uses a fake in-process transport — no network, no credential. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LiveProviderClient,
  LiveCallPolicy,
  StaticProviderCredentialResolver,
  requestRealProviderRendering,
  auditProviderAttempt,
  providerInstructionFrom,
  providerRenderingRequestFrom,
} from "../index.ts";
import type {
  LiveProviderTransport,
  LiveProviderTransportResult,
  ProviderClientRequest,
  ProviderClientConfig,
  ProviderSecretRef,
  ConcreteProviderRequestPayload,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const CONFIG: ProviderClientConfig = { providerKind: "live" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:live" };

// --- deterministic in-process transports (NOT network) -------------------------------------------
function safeText(p: ConcreteProviderRequestPayload): string {
  return `Reflecting on what we have: ${p.allowedClaims.join("; ")}. This may be incomplete.`;
}
const safeTransport: LiveProviderTransport = {
  async send(payload) {
    return { outcome: "response", body: { choices: [{ text: safeText(payload) }] } };
  },
};
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
function clientRequest(): ProviderClientRequest {
  const built = providerRenderingRequestFrom(req(supportRenderable()));
  if (built.status === "rejected") throw new Error("fixture must be safe");
  return { sourceCaseRef: "case:1", instruction: providerInstructionFrom(built.providerRequest), config: CONFIG, secret: PRESENT };
}

// Test 1 + 2 — live calls disabled by default → safe failure, transport never invoked.
test("a disabled policy fails safe and never invokes the transport", async () => {
  const spy = spyTransport();
  const client = new LiveProviderClient({
    policy: LiveCallPolicy.disabled(),
    resolver: new StaticProviderCredentialResolver({ status: "available" }),
    transport: spy.transport,
  });
  const res = await client.requestDraft(clientRequest());
  assert.equal(res.status, "failed");
  if (res.status === "failed") assert.equal(res.failure, "provider-unavailable");
  assert.equal(spy.calls(), 0, "transport must not be called when live is disabled");
});

// Test 3 + 4 — missing credential → safe failure, transport never invoked.
test("a missing credential fails safe and never invokes the transport", async () => {
  const spy = spyTransport();
  const client = new LiveProviderClient({
    policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }),
    resolver: new StaticProviderCredentialResolver({ status: "missing" }),
    transport: spy.transport,
  });
  const res = await client.requestDraft(clientRequest());
  assert.equal(res.status === "failed" && res.failure, "missing-credential");
  assert.equal(spy.calls(), 0, "transport must not be called when the credential is missing");
});

// Test 5 — invalid credential → safe failure, transport never invoked.
test("an invalid credential fails safe and never invokes the transport", async () => {
  const spy = spyTransport();
  const client = new LiveProviderClient({
    policy: LiveCallPolicy.enabled(),
    resolver: new StaticProviderCredentialResolver({ status: "invalid" }),
    transport: spy.transport,
  });
  const res = await client.requestDraft(clientRequest());
  assert.equal(res.status === "failed" && res.failure, "invalid-credential");
  assert.equal(spy.calls(), 0);
});

function liveClient(transport: LiveProviderTransport): LiveProviderClient {
  return new LiveProviderClient({
    policy: LiveCallPolicy.enabled({ timeoutMs: 1000 }),
    resolver: new StaticProviderCredentialResolver({ status: "available" }),
    transport,
  });
}

// Test 11 — a safe live draft becomes a RenderedMessage ONLY via the unchanged validateDraft.
test("a safe live draft passes only through validateDraft to become a RenderedMessage", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()), client: liveClient(safeTransport), config: CONFIG, secret: PRESENT,
  });
  assert.equal(out.status, "rendered");
  if (out.status !== "rendered") return;
  assert.equal(out.providerKind, "live");
  assert.equal(out.message.kind, "support");
  assert.equal(out.message.uncertaintyPreserved, true);
});

// Test 12-15 — an unsafe live draft is rejected by the validator; no RenderedMessage exists.
test("an unsafe live draft is rejected by the mandatory validator", async () => {
  const voiceEscalating: LiveProviderTransport = {
    async send(p) {
      return { outcome: "response", body: { choices: [{ text: `You should ${p.allowedClaims.join("; ")}. This may be incomplete.` }] } };
    },
  };
  const out = await requestRealProviderRendering({
    request: req(supportRenderable({ voice: "Reflection" })), client: liveClient(voiceEscalating), config: CONFIG, secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  if (out.status === "failed") {
    assert.equal(out.failure, "provider-output-failed-validation");
    assert.ok(out.renderingFailures?.includes("voice-escalation"));
  }
});

// Test 17 — provider metadata stays operational; it never surfaces as a domain field on the outcome.
test("a rendered live outcome surfaces no operational metadata as a domain field", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()), client: liveClient(safeTransport), config: CONFIG, secret: PRESENT,
  });
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["latencyms", "tokencount", "finishreason", "metadata"]) {
    assert.ok(!json.includes(banned), `outcome must not surface metadata field '${banned}'`);
  }
});

// Test 22 — no outcome path leaks the credential token / secret material.
test("no live outcome leaks the credential token or secret material", async () => {
  for (const transport of [safeTransport, { async send(): Promise<LiveProviderTransportResult> { return { outcome: "error", error: { kind: "timeout" } }; } }]) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()), client: liveClient(transport), config: CONFIG, secret: PRESENT,
    });
    const json = JSON.stringify(out).toLowerCase();
    for (const banned of ["opaque:test-credential", "bearer", "authorization", "secret", "apikey", "api_key", "credential", "ref:live"]) {
      assert.ok(!json.includes(banned), `outcome must not leak '${banned}'`);
    }
  }
});

// Test 18 — the raw-free audit observes a live outcome and retains no raw draft / prompt / secret when composed.
test("the provider-attempt audit retains no raw draft/prompt/secret for a composed live attempt", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()), client: liveClient(safeTransport), config: CONFIG, secret: PRESENT,
  });
  const rec = auditProviderAttempt({
    request: req(supportRenderable()), outcome: out, providerAdapterKind: "live",
    requestedAt: timestamp("2026-05-01T10:00:00.000Z"), completedAt: timestamp("2026-05-01T10:00:01.000Z"), createdAt: timestamp("2026-05-01T10:00:02.000Z"),
  });
  assert.equal(rec.draftSummary.rawDraftRetained, false);
  const json = JSON.stringify(rec.toState()).toLowerCase();
  for (const banned of ["reflecting on what we have", "you should", "opaque:test-credential", "ref:live", "secret"]) {
    assert.ok(!json.includes(banned), `audit must not retain '${banned}'`);
  }
});

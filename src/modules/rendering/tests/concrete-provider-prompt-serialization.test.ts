// Implementation 020 — the prompt serializer is a PURE, deterministic projection of a ProviderInstruction
// into a neutral provider-shaped payload. It carries ONLY safe, domain-approved constraints; there is no
// field through which an arbitrary prompt / chain-of-thought / hidden reasoning / voice override / secret
// could reach the payload. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { serializeProviderInstruction } from "../index.ts";
import type { ProviderInstruction } from "../index.ts";

function instruction(over: Partial<ProviderInstruction> = {}): ProviderInstruction {
  return {
    kind: "support",
    voice: "Reflection",
    allowedClaims: ["energy felt low in today's session"],
    forbiddenClaims: ["resting hr was 80"],
    uncertaintyVisibleRequired: true,
    limitations: ["only one session observed"],
    traceabilitySummary: "resolved to the recorded set",
    traceabilityStatus: "complete",
    style: "clearer",
    locale: "en",
    maxLength: 280,
    ...over,
  };
}

// Test — the payload carries only the approved safety constraints (style, locale, kind, voice, claims, etc.).
test("the serializer projects only approved safety constraints", () => {
  const payload = serializeProviderInstruction(instruction());
  assert.equal(payload.terminalOutputKind, "support");
  assert.equal(payload.voice, "Reflection");
  assert.equal(payload.style, "clearer");
  assert.equal(payload.locale, "en");
  assert.equal(payload.maxLength, 280);
  assert.deepEqual(payload.allowedClaims, ["energy felt low in today's session"]);
  assert.deepEqual(payload.forbiddenClaims, ["resting hr was 80"]);
  assert.equal(payload.uncertaintyVisibleRequired, true);
  assert.deepEqual(payload.limitationsVisible, ["only one session observed"]);
  assert.equal(payload.traceabilitySummary, "resolved to the recorded set");
  assert.equal(payload.traceabilityStatus, "complete");
});

// Test 16 — prompt injection / arbitrary instruction material cannot reach the payload (no such field exists).
test("the payload exposes no field for arbitrary prompt / chain-of-thought / hidden reasoning / secret", () => {
  const payload = serializeProviderInstruction(instruction());
  const keys = new Set(Object.keys(payload));
  const allowed = new Set([
    "terminalOutputKind", "voice", "style", "locale", "maxLength", "allowedClaims",
    "forbiddenClaims", "uncertaintyVisibleRequired", "limitationsVisible",
    "traceabilitySummary", "traceabilityStatus",
  ]);
  for (const k of keys) assert.ok(allowed.has(k), `payload has an unexpected field '${k}'`);
  for (const banned of ["prompt", "system", "rawPrompt", "chainOfThought", "reasoning", "secret", "apiKey", "handle", "messages"]) {
    assert.equal(keys.has(banned), false, `payload must not expose '${banned}'`);
  }
});

// Test — determinism + no leaked secret in the payload content.
test("the serializer is deterministic and leaks no secret", () => {
  const a = JSON.stringify(serializeProviderInstruction(instruction()));
  const b = JSON.stringify(serializeProviderInstruction(instruction()));
  assert.equal(a, b);
  const lower = a.toLowerCase();
  for (const banned of ["secret", "apikey", "api_key", "credential", "ref:"]) {
    assert.ok(!lower.includes(banned), `payload must not contain '${banned}'`);
  }
});

// Test — optional fields are omitted (not set to undefined) so exactOptionalPropertyTypes stays satisfied.
test("absent optional instruction fields are omitted from the payload", () => {
  const payload = serializeProviderInstruction({
    kind: "inquiry",
    allowedClaims: ["was the session harder than planned"],
    forbiddenClaims: [],
    uncertaintyVisibleRequired: true,
    limitations: [],
  });
  assert.equal("voice" in payload, false);
  assert.equal("style" in payload, false);
  assert.equal("locale" in payload, false);
  assert.equal("maxLength" in payload, false);
  assert.equal("traceabilitySummary" in payload, false);
});

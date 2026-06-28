// Implementation 020 — the response parser and error mapper are PURE and deterministic. The parser extracts
// ONLY draft text as an UNTRUSTED draft (+ operational metadata) and maps empty / malformed responses to safe
// operational failures; it retains no raw payload. The error mapper maps every provider-shaped error DOWN to
// the existing closed ProviderOperationalFailure (then the existing toProviderFailure -> ProviderFailure),
// with unknown errors failing safe and leaking nothing. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseProviderResponse, mapProviderError, toProviderFailure } from "../index.ts";
import type { ProviderOperationalFailure, ProviderFailure } from "../index.ts";

// --- parser ---------------------------------------------------------------------------------------

// Test 11 (parse) — a well-formed response yields an untrusted draft + operational metadata only.
test("parser returns an untrusted draft with operational metadata", () => {
  const res = parseProviderResponse(
    { choices: [{ text: "Reflecting on what we have: x. This may be incomplete." }], finishReason: "stop", usage: { totalTokens: 9 }, latencyMs: 4 },
    "concrete",
  );
  assert.equal(res.status, "draft");
  if (res.status !== "draft") return;
  assert.equal(res.text, "Reflecting on what we have: x. This may be incomplete.");
  assert.equal(res.metadata?.providerKind, "concrete");
  assert.equal(res.metadata?.finishReason, "stop");
  assert.equal(res.metadata?.tokenCount, 9);
  assert.equal(res.metadata?.latencyMs, 4);
});

// Test 9 — empty response maps to a safe operational failure.
test("an empty response maps to provider-returned-empty-response", () => {
  for (const empty of [{ choices: [{ text: "" }] }, { choices: [{ text: "   " }] }]) {
    const res = parseProviderResponse(empty, "concrete");
    assert.equal(res.status, "failed");
    if (res.status !== "failed") return;
    assert.equal(res.failure, "provider-returned-empty-response");
  }
});

// Test 8 — malformed responses map to a safe operational failure.
test("malformed responses map to provider-returned-malformed-response", () => {
  for (const bad of [null, 42, "nope", {}, { choices: [] }, { choices: [{}] }, { choices: [{ text: 5 }] }]) {
    const res = parseProviderResponse(bad, "concrete");
    assert.equal(res.status, "failed", `expected failure for ${JSON.stringify(bad)}`);
    if (res.status !== "failed") continue;
    assert.equal(res.failure, "provider-returned-malformed-response");
  }
});

// Test 17 — the parser keeps no raw provider payload; only the draft text + operational metadata survive.
test("the parser retains no raw provider payload in its returned state", () => {
  const res = parseProviderResponse(
    { choices: [{ text: "Reflecting on x. This may be incomplete." }], systemFingerprint: "fp_secret_internal", raw: { key: "should-not-survive" } },
    "concrete",
  );
  const json = JSON.stringify(res);
  assert.equal(json.includes("fp_secret_internal"), false);
  assert.equal(json.includes("should-not-survive"), false);
  assert.equal(json.includes("systemFingerprint"), false);
});

// --- error mapper ---------------------------------------------------------------------------------

// Test 10 — every provider-shaped error maps to the expected existing ProviderOperationalFailure...
test("provider-shaped errors map to the existing operational failures", () => {
  const cases: ReadonlyArray<readonly [string, ProviderOperationalFailure]> = [
    ["live-disabled", "provider-unavailable"],
    ["missing-credential", "missing-credential"],
    ["invalid-credential", "invalid-credential"],
    ["network-unavailable", "provider-unavailable"],
    ["timeout", "provider-timeout"],
    ["rate-limit", "provider-rate-limited"],
    ["refusal", "provider-refused"],
    ["empty-response", "provider-returned-empty-response"],
    ["malformed-response", "provider-returned-malformed-response"],
    ["unsupported-config", "unsupported-provider-config"],
    ["unknown", "provider-unavailable"],
  ];
  for (const [kind, expected] of cases) {
    assert.equal(mapProviderError({ kind }), expected, `error '${kind}' must map to '${expected}'`);
  }
});

// ...and each then maps DOWN to the existing closed ProviderFailure (no expansion).
test("operational failures map further down to existing ProviderFailure values", () => {
  const downstream: ReadonlyArray<readonly [ProviderOperationalFailure, ProviderFailure]> = [
    ["missing-credential", "provider-unavailable"],
    ["invalid-credential", "provider-unavailable"],
    ["provider-timeout", "provider-timeout"],
    ["provider-rate-limited", "provider-rate-limited"],
    ["provider-refused", "provider-refused"],
    ["provider-returned-empty-response", "provider-returned-empty-draft"],
    ["provider-returned-malformed-response", "provider-returned-invalid-draft"],
    ["unsupported-provider-config", "provider-unavailable"],
  ];
  for (const [op, expected] of downstream) assert.equal(toProviderFailure(op), expected);
});

// an unknown / non-discriminated error fails safe and copies no raw payload.
test("an unknown error shape fails safe and leaks no raw payload", () => {
  for (const weird of [null, undefined, 7, "boom", { code: 500, message: "raw secret token=abc123" }, {}]) {
    const op = mapProviderError(weird);
    assert.equal(op, "provider-unavailable");
    assert.equal(JSON.stringify(op).includes("abc123"), false);
  }
});

// Implementation 020 — the provider-selection decision is explicit (doc/decision level) and the NEUTRAL
// concrete adapter shell is wired behind the existing async ProviderClientBoundary: disabled by default, and
// — when given a deterministic in-process transport — its draft becomes a RenderedMessage ONLY via the
// unchanged validateDraft. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ConcreteProviderClient,
  requestRealProviderRendering,
} from "../index.ts";
import type {
  ConcreteProviderRequestPayload,
  ConcreteProviderFixture,
  ProviderClientConfig,
  ProviderSecretRef,
} from "../index.ts";
import { supportRenderable, inquiryRenderable, withholdingRenderable, req } from "./fixtures.ts";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const repoRoot = join(here, "..", "..", "..", ".."); // tests -> rendering -> modules -> src -> root

const CONFIG: ProviderClientConfig = { providerKind: "concrete" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:concrete" };

// a deterministic in-process transport that returns a SAFE provider-shaped response for the payload.
function safeText(p: ConcreteProviderRequestPayload): string {
  const b = p.allowedClaims.join("; ");
  if (p.terminalOutputKind === "inquiry") return `Aurora needs to ask: ${b}?`;
  if (p.terminalOutputKind === "withholding") return `Aurora is not offering guidance here. Reason: ${b}.`;
  return `Reflecting on what we have: ${b}. This may be incomplete.`;
}
const safeTransport = (p: ConcreteProviderRequestPayload): ConcreteProviderFixture =>
  ({ outcome: "response", response: { choices: [{ text: safeText(p) }], finishReason: "stop", usage: { totalTokens: 7 } } });

// Test 1 — the provider-selection decision is explicit at the doc/decision level (no vendor token in code).
test("the provider-selection decision is recorded explicitly in Tech Spec 020A", () => {
  const doc = join(repoRoot, "docs", "specs", "020-real-provider-adapter-implementation-boundary-tech.md");
  assert.equal(existsSync(doc), true, "Tech Spec 020A must exist");
  const text = readFileSync(doc, "utf8");
  assert.ok(/\[DECISION\]/.test(text), "020A must record a decision");
  assert.ok(/First concrete provider/i.test(text), "020A must record the first-concrete-provider selection");
});

// Test 2 — the neutral concrete shell exists and is compatible with ProviderClientBoundary.
test("ConcreteProviderClient implements the async ProviderClientBoundary with a neutral kind", () => {
  const client = new ConcreteProviderClient();
  assert.equal(typeof client.requestDraft, "function");
  assert.equal(client.kind, "concrete");
  assert.notEqual(client.kind, "openai"); // code stays vendor-neutral
});

// Test 11 (compat) — a safe draft from the concrete client becomes a RenderedMessage, only via the validator.
test("a safe concrete-client draft becomes a RenderedMessage after validation", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new ConcreteProviderClient({ transport: safeTransport }),
    config: CONFIG,
    secret: PRESENT,
  });
  assert.equal(out.status, "rendered");
  if (out.status !== "rendered") return;
  assert.equal(out.providerKind, "concrete");
  assert.equal(out.message.kind, "support");
  assert.equal(out.message.uncertaintyPreserved, true);
});

test("safe inquiry / withholding drafts from the concrete client render correctly", async () => {
  const client = new ConcreteProviderClient({ transport: safeTransport });
  assert.equal((await requestRealProviderRendering({ request: req(inquiryRenderable()), client, config: CONFIG, secret: PRESENT })).status, "rendered");
  assert.equal((await requestRealProviderRendering({ request: req(withholdingRenderable()), client, config: CONFIG, secret: PRESENT })).status, "rendered");
});

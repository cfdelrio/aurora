// Implementation 020 — negative capability + boundary guards for the NEUTRAL concrete-provider adapter shell.
// It is disabled by default, makes no live call, requires no credential, reads no env, uses no SDK, leaks no
// secret, and adds no package dependency. Its draft is untrusted: it becomes a RenderedMessage ONLY via the
// unchanged validateDraft, and the raw-free audit observes the outcome with no raw draft/prompt/secret.
// Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ConcreteProviderClient,
  requestRealProviderRendering,
  auditProviderAttempt,
  providerInstructionFrom,
  providerRenderingRequestFrom,
} from "../index.ts";
import type {
  ConcreteProviderRequestPayload,
  ConcreteProviderFixture,
  ProviderClientConfig,
  ProviderClientRequest,
  ProviderSecretRef,
  ProviderInstruction,
  RenderableDomainOutput,
} from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const renderingDir = join(here, ".."); // rendering
const modulesDir = join(renderingDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src
const repoRoot = join(srcDir, ".."); // repo root

const CONFIG: ProviderClientConfig = { providerKind: "concrete" };
const PRESENT: ProviderSecretRef = { status: "present", ref: "ref:concrete" };

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

function concreteFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && /concrete-provider/.test(f),
  );
}

// --- deterministic in-process transports (NOT network) -------------------------------------------
function body(p: ConcreteProviderRequestPayload): string {
  return p.allowedClaims.join("; ");
}
const safeTransport = (p: ConcreteProviderRequestPayload): ConcreteProviderFixture =>
  ({ outcome: "response", response: { choices: [{ text: `Reflecting on what we have: ${body(p)}. This may be incomplete.` }] } });
const voiceEscalatingTransport = (p: ConcreteProviderRequestPayload): ConcreteProviderFixture =>
  ({ outcome: "response", response: { choices: [{ text: `You should ${body(p)}. This may be incomplete.` }] } });
const inventedFactTransport = (p: ConcreteProviderRequestPayload): ConcreteProviderFixture =>
  ({ outcome: "response", response: { choices: [{ text: `Reflecting on what we have: ${body(p)}. ${p.forbiddenClaims[0] ?? "an invented detail"}. This may be incomplete.` }] } });
const hiddenUncertaintyTransport = (p: ConcreteProviderRequestPayload): ConcreteProviderFixture =>
  ({ outcome: "response", response: { choices: [{ text: `Here is the assessment: ${body(p)}.` }] } });
const errorTransport = (kind: string) => (): ConcreteProviderFixture => ({ outcome: "error", error: { kind } });

function clientRequest(secret: ProviderSecretRef): ProviderClientRequest {
  const instruction: ProviderInstruction = providerInstructionFrom(
    (() => {
      const built = providerRenderingRequestFrom(req(supportRenderable()));
      if (built.status === "rejected") throw new Error("fixture request must be safe");
      return built.providerRequest;
    })(),
  );
  return { sourceCaseRef: "case:1", instruction, config: CONFIG, secret };
}

// Test 2 — live calls are DISABLED by default (no transport => safe failure, no work).
test("the concrete client is disabled by default and fails safe", async () => {
  const res = await new ConcreteProviderClient().requestDraft(clientRequest(PRESENT));
  assert.equal(res.status, "failed");
  if (res.status !== "failed") return;
  assert.equal(res.failure, "provider-unavailable");
});

// Test 3 — deterministic tests require no real credentials (the secret is an opaque ref, never a key).
test("the present credential carries only an opaque ref, no key", () => {
  assert.deepEqual(Object.keys(PRESENT).sort(), ["ref", "status"]);
  assert.equal(PRESENT.ref, "ref:concrete");
});

// Tests 4 & 5 — missing / invalid credential map to safe failures (client level + service level).
test("missing / invalid credential map to safe failures", async () => {
  const missing = await new ConcreteProviderClient({ transport: safeTransport }).requestDraft(clientRequest({ status: "missing" }));
  assert.equal(missing.status === "failed" && missing.failure, "missing-credential");
  const invalid = await new ConcreteProviderClient({ transport: safeTransport }).requestDraft(clientRequest({ status: "invalid" }));
  assert.equal(invalid.status === "failed" && invalid.failure, "invalid-credential");

  for (const status of ["missing", "invalid"] as const) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()),
      client: new ConcreteProviderClient({ transport: safeTransport }),
      config: CONFIG,
      secret: { status },
    });
    assert.equal(out.status, "failed");
    if (out.status === "failed") assert.equal(out.failure, "provider-unavailable");
  }
});

// Tests 6 & 7 — timeout / rate-limit (transport errors) map to safe provider failures.
test("timeout and rate-limit map to safe provider failures via the service", async () => {
  const timeout = await requestRealProviderRendering({
    request: req(supportRenderable()), client: new ConcreteProviderClient({ transport: errorTransport("timeout") }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(timeout.status === "failed" && timeout.failure, "provider-timeout");
  const limited = await requestRealProviderRendering({
    request: req(supportRenderable()), client: new ConcreteProviderClient({ transport: errorTransport("rate-limit") }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(limited.status === "failed" && limited.failure, "provider-rate-limited");
});

// Tests 12-15 — provider drafts cannot bypass validation; unsafe drafts are rejected by the unchanged validator.
test("unsafe concrete-client drafts are rejected by the mandatory validator", async () => {
  const voice = await requestRealProviderRendering({
    request: req(supportRenderable({ voice: "Reflection" })), client: new ConcreteProviderClient({ transport: voiceEscalatingTransport }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(voice.status, "failed");
  if (voice.status === "failed") { assert.equal(voice.failure, "provider-output-failed-validation"); assert.ok(voice.renderingFailures?.includes("voice-escalation")); }

  const invented = await requestRealProviderRendering({
    request: req(supportRenderable({ forbiddenClaims: ["resting hr was 80"] })), client: new ConcreteProviderClient({ transport: inventedFactTransport }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(invented.status === "failed" && invented.failure, "provider-output-failed-validation");
  if (invented.status === "failed") assert.ok(invented.renderingFailures?.includes("invented-fact"));

  const hidden = await requestRealProviderRendering({
    request: req(supportRenderable({ uncertaintyVisibleRequired: true, limitations: [] })), client: new ConcreteProviderClient({ transport: hiddenUncertaintyTransport }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(hidden.status, "failed");
  if (hidden.status === "failed") assert.ok(hidden.renderingFailures?.includes("uncertainty-hidden"));
});

// Test 17 — provider metadata stays operational; it never surfaces as a domain field on the outcome.
test("provider metadata does not surface as a domain field on the rendered outcome", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()), client: new ConcreteProviderClient({ transport: safeTransport }), config: CONFIG, secret: PRESENT,
  });
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["latencyms", "tokencount", "finishreason", "metadata"]) {
    assert.ok(!json.includes(banned), `outcome must not surface metadata field '${banned}'`);
  }
});

// Test 18 — the raw-free audit observes the outcome and retains no raw draft / prompt / secret when composed.
test("the provider-attempt audit retains no raw draft/prompt/secret when composed with the concrete path", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()), client: new ConcreteProviderClient({ transport: safeTransport }), config: CONFIG, secret: PRESENT,
  });
  const rec = auditProviderAttempt({
    request: req(supportRenderable()), outcome: out, providerAdapterKind: "concrete",
    requestedAt: timestamp("2026-04-01T10:00:00.000Z"), completedAt: timestamp("2026-04-01T10:00:01.000Z"), createdAt: timestamp("2026-04-01T10:00:02.000Z"),
  });
  assert.equal(rec.draftSummary.rawDraftRetained, false);
  const json = JSON.stringify(rec.toState()).toLowerCase();
  for (const banned of ["reflecting on what we have", "you should", "ref:concrete", "secret"]) {
    assert.ok(!json.includes(banned), `audit must not retain '${banned}'`);
  }
});

// Tests 19 & 20 — success has no side effects; failure does not mutate the domain.
test("success yields only an outcome (no record/review/display/delivery/event) and mutates nothing", async () => {
  const renderable: RenderableDomainOutput = supportRenderable();
  const before = JSON.stringify(renderable);
  const out = await requestRealProviderRendering({
    request: req(renderable), client: new ConcreteProviderClient({ transport: safeTransport }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(JSON.stringify(renderable), before);
  for (const banned of ["record", "review", "displayEligibility", "delivery", "event"]) {
    assert.equal(Object.keys(out).includes(banned), false);
  }
});

test("a provider failure does not mutate the renderable", async () => {
  const renderable: RenderableDomainOutput = supportRenderable();
  const before = JSON.stringify(renderable);
  const out = await requestRealProviderRendering({
    request: req(renderable), client: new ConcreteProviderClient({ transport: errorTransport("refusal") }), config: CONFIG, secret: PRESENT,
  });
  assert.equal(out.status, "failed");
  assert.equal(JSON.stringify(renderable), before);
});

// Test 22 — secrets never appear on any outcome path (success or failure).
test("no concrete-path outcome leaks the secret ref", async () => {
  for (const transport of [safeTransport, errorTransport("timeout")]) {
    const out = await requestRealProviderRendering({
      request: req(supportRenderable()), client: new ConcreteProviderClient({ transport }), config: CONFIG, secret: PRESENT,
    });
    const json = JSON.stringify(out).toLowerCase();
    for (const banned of ["ref:concrete", "secret", "apikey", "api_key", "credential"]) {
      assert.ok(!json.includes(banned), `outcome must not leak '${banned}'`);
    }
  }
});

// Test 23 (structure) — concrete-provider files stay inside rendering and import no forbidden module.
test("concrete-provider files import no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  const files = concreteFiles();
  assert.ok(files.length >= 4, "expected the four concrete-provider files to exist");
  for (const f of files) assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
});

test("concrete-provider files' decision-support imports are type-only (read-only)", () => {
  for (const f of concreteFiles()) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()}`);
      }
    }
  }
});

// Test 21 + token guards — no SDK / network / env / vendor token / retry / scheduler in concrete files.
test("concrete-provider files contain no SDK / network / env / vendor / retry / scheduler token", () => {
  const sdkNetEnv = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i;
  const schedRetry = /\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i;
  for (const f of concreteFiles()) {
    const src = readFileSync(f, "utf8");
    assert.equal(sdkNetEnv.test(src), false, `forbidden SDK/network/env/vendor token in ${f}`);
    assert.equal(schedRetry.test(src), false, `forbidden retry/scheduler token in ${f}`);
  }
});

test("no module outside rendering imports the concrete-provider shell", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      for (const sym of ["ConcreteProviderClient", "serializeProviderInstruction", "parseProviderResponse", "mapProviderError"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the concrete-provider symbol '${sym}': ${f}`);
      }
    }
  }
});

test("no provider/llm/etc top-level module and no api/ui/infra/providers/prompts layer was created", () => {
  for (const forbidden of [
    join("modules", "provider"), join("modules", "llm"), join("modules", "openai"), join("modules", "anthropic"),
    join("modules", "model"), join("modules", "telemetry"), join("modules", "evaluation"),
    "api", "ui", "infrastructure", "providers", "prompts",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

// no SDK package dependency was added.
test("no SDK / HTTP package dependency was added", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "the only approved runtime dependency is pg (043-D2-R)");
  const devKeys = Object.keys(pkg.devDependencies ?? {}).sort();
  assert.deepEqual(devKeys, ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
});

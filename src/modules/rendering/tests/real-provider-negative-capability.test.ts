// Implementation 019 — negative capability + boundary guards for the real-provider-ready boundary. The
// files live inside `rendering`, import only own module + shared-kernel (+ read-only decision-support TYPES),
// never import event-recording/delivery/upstream, contain no SDK/network/prompt/env token or raw secret,
// and create no provider/llm/telemetry top-level module. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FakeProviderClient, requestRealProviderRendering } from "../index.ts";
import type { ProviderClientConfig, ProviderSecretRef } from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const renderingDir = join(here, ".."); // rendering
const modulesDir = join(renderingDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

// the real-provider-ready production files
function realProviderFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) =>
      !f.endsWith(".test.ts") &&
      !f.includes("/tests/") &&
      /(real-provider|provider-client|provider-instruction|provider-secret-ref|provider-operational-failure)/.test(f),
  );
}

test("real-provider files import no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of realProviderFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
  assert.ok(realProviderFiles().length >= 8, "expected the real-provider-ready files to exist");
});

test("real-provider files' decision-support imports are type-only (read-only)", () => {
  for (const f of realProviderFiles()) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()} (${f})`);
      }
    }
  }
});

test("real-provider files contain no SDK / network / prompt / env token", () => {
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i;
  for (const f of realProviderFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden SDK/network/env token in ${f}`);
  }
});

test("no provider / llm / telemetry / evaluation top-level module and no api/ui/infra/providers/prompts layer", () => {
  for (const forbidden of [
    join("modules", "provider"),
    join("modules", "llm"),
    join("modules", "openai"),
    join("modules", "anthropic"),
    join("modules", "model"),
    join("modules", "telemetry"),
    join("modules", "evaluation"),
    "api",
    "ui",
    "infrastructure",
    "providers",
    "prompts",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no module outside rendering imports the real-provider-ready boundary", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      for (const sym of ["requestRealProviderRendering", "FakeProviderClient", "ProviderClientBoundary", "realProviderAdapter"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the real-provider boundary symbol '${sym}': ${f}`);
      }
    }
  }
});

test("the existing synchronous provider seam is still present and unchanged in shape", () => {
  const adapter = readFileSync(join(renderingDir, "application", "provider-adapter.ts"), "utf8");
  // sync seam: draft(...) returns ProviderDraftOutcome, NOT a Promise
  assert.ok(adapter.includes("draft(request: ProviderRenderingRequest): ProviderDraftOutcome"));
  assert.equal(/Promise</.test(adapter), false, "the sync ProviderAdapter port must remain synchronous");
});

test("a returned outcome / its operational path leaks no raw secret", async () => {
  const out = await requestRealProviderRendering({
    request: req(supportRenderable()),
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" } satisfies ProviderClientConfig,
    secret: { status: "present", ref: "ref:fake" } satisfies ProviderSecretRef,
  });
  const json = JSON.stringify(out).toLowerCase();
  // the opaque ref is operational; it must not surface on the domain-facing outcome
  for (const banned of ["ref:fake", "secret", "apikey", "api_key", "credential"]) {
    assert.ok(!json.includes(banned), `outcome must not leak '${banned}'`);
  }
});

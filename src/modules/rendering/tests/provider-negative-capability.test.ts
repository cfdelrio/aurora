// Implementation 017 — negative capability + boundary guards for the provider seam. The provider files
// live inside `rendering`, import only own module + shared-kernel (+ read-only decision-support TYPES),
// never import delivery/event-recording/upstream, contain no SDK/network/prompt token, and create no
// real provider/llm top-level module. The provider does not bypass the validator or persist/deliver.
// Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { requestProviderRendering, FakeProviderAdapter } from "../index.ts";
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

// the provider seam's production files
function providerFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) =>
      !f.endsWith(".test.ts") &&
      !f.includes("/tests/") &&
      /provider-/.test(f),
  );
}

test("provider files import no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of providerFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
});

test("provider files' decision-support imports are type-only (read-only)", () => {
  for (const f of providerFiles()) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()} (${f})`);
      }
    }
  }
});

test("provider files contain no real provider SDK / network / prompt token", () => {
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i;
  for (const f of providerFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden provider/network token in ${f}`);
  }
  assert.ok(providerFiles().length >= 5, "expected the provider seam files to exist");
});

test("no provider / llm / model top-level module and no api/ui/infrastructure/providers/prompts layer exists", () => {
  for (const forbidden of [
    join("modules", "provider"),
    join("modules", "llm"),
    join("modules", "openai"),
    join("modules", "anthropic"),
    join("modules", "model"),
    "api",
    "ui",
    "infrastructure",
    "providers",
    "prompts",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no module outside rendering imports the provider seam", () => {
  // `delivery` legitimately imports `rendering` read-only (Impl 016); the precise invariant is that the
  // PROVIDER SEAM (the provider-* files) is imported by nothing outside rendering.
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      assert.equal(
        /from\s+["'][^"']*\/rendering\/[^"']*provider/.test(src),
        false,
        `${mod} must not import the rendering provider seam: ${f}`,
      );
      for (const sym of ["requestProviderRendering", "FakeProviderAdapter", "ProviderAdapter", "providerRenderingRequestFrom"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the provider seam symbol '${sym}': ${f}`);
      }
    }
  }
});

test("a provider draft that fails validation is not source truth (no message, only a failure)", () => {
  const out = requestProviderRendering({
    request: req(supportRenderable({ voice: "Reflection" })),
    provider: new FakeProviderAdapter({ scenario: "voice-escalating" }),
  });
  assert.equal(out.status, "failed");
  assert.equal("message" in out, false);
});

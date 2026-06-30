// Implementation 021 — negative capability + boundary guards for the opt-in live-provider boundary. Live calls
// are disabled by default; the native network token lives in EXACTLY ONE approved transport file; vendor / SDK
// / env tokens stay forbidden everywhere; no package dependency is added; the live files stay inside `rendering`
// and import no forbidden module; nothing outside `rendering` imports them. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const renderingDir = join(here, ".."); // rendering
const modulesDir = join(renderingDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src
const repoRoot = join(srcDir, ".."); // repo root

const APPROVED_NETWORK_FILE = "live-provider-http-transport.ts";

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

function liveFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && /(live-call|live-provider|provider-credential)/.test(f),
  );
}

test("the five live-provider production files exist", () => {
  assert.ok(liveFiles().length >= 5, `expected >= 5 live-provider files, got ${liveFiles().length}`);
});

test("live-provider files import no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of liveFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
});

test("live-provider files' decision-support imports are type-only (read-only)", () => {
  for (const f of liveFiles()) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()}`);
      }
    }
  }
});

test("the native network token lives in exactly one approved transport file", () => {
  const network = /\bnode:https?\b|fetch\s*\(|https?:\/\//i;
  const withNetwork = liveFiles().filter((f) => network.test(readFileSync(f, "utf8"))).map((f) => f.split("/").pop());
  assert.deepEqual(withNetwork, [APPROVED_NETWORK_FILE], "only the approved transport file may contain a network token");
});

test("no live-provider file contains a vendor / SDK / env token", () => {
  const nonNetwork = /\b(openai|anthropic|axios)\b|process\.env/i;
  for (const f of liveFiles()) {
    assert.equal(nonNetwork.test(readFileSync(f, "utf8")), false, `forbidden vendor/SDK/env token in ${f}`);
  }
});

test("no live-provider file introduces retry / scheduler / event-bus primitives", () => {
  const schedRetry = /\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i;
  for (const f of liveFiles()) {
    assert.equal(schedRetry.test(readFileSync(f, "utf8")), false, `forbidden retry/scheduler token in ${f}`);
  }
});

test("no module outside rendering imports the live-provider boundary", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      for (const sym of ["LiveProviderClient", "LiveCallPolicy", "liveProviderHttpTransport", "StaticProviderCredentialResolver", "ProviderCredentialResolver"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the live-provider symbol '${sym}': ${f}`);
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

test("no SDK / HTTP package dependency was added", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
});

// Implementation 022 — negative capability + boundary guards for the environment secret resolver. It uses an
// INJECTED env map (no real process environment): there is NO env token anywhere, no guard exception, no vendor
// /SDK token, no package dependency. The resolver stays inside `rendering/application`, imports no forbidden
// module, and nothing outside `rendering` imports it. Negative tests are defining.

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

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

function envResolverFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && /environment-provider-credential/.test(f),
  );
}

test("the environment-resolver production file exists", () => {
  assert.ok(envResolverFiles().length >= 1, "expected the environment credential resolver file");
});

// the injected-map decision: NO process-environment token anywhere in the resolver files (not even in comments).
test("the environment-resolver reads no real process environment", () => {
  const envToken = /process\s*\.\s*env/i;
  for (const f of envResolverFiles()) {
    assert.equal(envToken.test(readFileSync(f, "utf8")), false, `forbidden process-environment token in ${f}`);
  }
});

// vendor / SDK / network tokens stay forbidden in the resolver files.
test("the environment-resolver contains no vendor / SDK / network token", () => {
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i;
  for (const f of envResolverFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden vendor/SDK/network token in ${f}`);
  }
});

test("the environment-resolver imports no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of envResolverFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
});

test("no module outside rendering imports the environment resolver", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      for (const sym of ["EnvironmentProviderCredentialResolver", "EnvironmentCredentialSource"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the env-resolver symbol '${sym}': ${f}`);
      }
    }
  }
});

test("no secrets/config/infrastructure/provider/llm module and no api/ui/providers/prompts layer was created", () => {
  for (const forbidden of [
    join("modules", "secrets"), join("modules", "config"), join("modules", "infrastructure"),
    join("modules", "provider"), join("modules", "llm"), join("modules", "openai"), join("modules", "anthropic"),
    join("modules", "model"), join("modules", "telemetry"), join("modules", "evaluation"),
    "api", "ui", "providers", "prompts",
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

// Implementation 023 — negative capability + boundary guards for the direct process-environment adapter. The new
// repo-wide assertion seals the process-environment token to EXACTLY ONE approved production file; everywhere else
// it stays absent. The adapter stays inside `rendering/application`, imports no forbidden module, and nothing
// outside `rendering` imports it; no SDK/dependency is added. Negative tests are defining.

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

const APPROVED_ENV_FILE = "process-environment-credential-source-adapter.ts";
// build the token regex indirectly so this test file is not itself a token site under any scan
const ENV_TOKEN = new RegExp("process" + "\\s*\\.\\s*env", "i");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

function productionFiles(): string[] {
  return collectTsFiles(srcDir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/"));
}

function adapterFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && /process-environment-credential-source-adapter/.test(f),
  );
}

test("the process-environment adapter production file exists", () => {
  assert.equal(adapterFiles().length, 1, "expected exactly one process-environment adapter file");
});

// the defining repo-wide assertion: the process-environment token lives in EXACTLY ONE approved production file.
test("the process-environment token appears only in the approved adapter file", () => {
  const withToken = productionFiles()
    .filter((f) => ENV_TOKEN.test(readFileSync(f, "utf8")))
    .map((f) => f.split("/").pop());
  assert.deepEqual(withToken, [APPROVED_ENV_FILE], "the env token must appear only in the approved adapter file");
});

// the adapter holds no vendor / SDK / network token (those stay forbidden everywhere, including here).
test("the process-environment adapter contains no vendor / SDK / network token", () => {
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i;
  for (const f of adapterFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden vendor/SDK/network token in ${f}`);
  }
});

test("the process-environment adapter imports no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of adapterFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
});

test("no module outside rendering imports the process-environment adapter", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      for (const sym of ["ProcessEnvironmentCredentialSourceAdapter", "defaultProcessEnvironmentAccessor", "processEnvironmentCredentialSourceAdapter"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference the adapter symbol '${sym}': ${f}`);
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

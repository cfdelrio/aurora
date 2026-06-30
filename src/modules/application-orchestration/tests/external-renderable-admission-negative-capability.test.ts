// Implementation 035-A — negative capability + boundary guards for the Tier 2 external renderable admission
// check. It is a PURE structural pre-screen in application-orchestration: it inspects only rendering types
// (via the public index), owns no whole-core chain, imports no observation/reasoning/understanding/athlete,
// calls no provider, runs no validateDraft, performs no delivery, creates no AthleteDecision, records no
// events, reads no process environment, and adds no module/script. AC20 + the Impl 025 guard remain intact.
// offlineReflectionRuntime is unchanged (integration is 035-B). Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../application-orchestration/tests
const moduleDir = join(here, ".."); // .../application-orchestration
const modulesDir = join(moduleDir, ".."); // .../modules
const srcDir = join(modulesDir, ".."); // .../src
const repoRoot = join(srcDir, ".."); // repo root
const admissionPath = join(moduleDir, "application", "external-renderable-admission.ts");
const runtimePath = join(moduleDir, "application", "offline-reflection-runtime.ts");
const operatorScriptPath = join(repoRoot, "scripts", "operator-live-smoke.mjs");

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
function productionFiles(dir: string): string[] {
  return collectTsFiles(dir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && !f.includes("__tests__"));
}
// Strip // line comments and /* */ block comments so token scans inspect CODE only (the production file's
// prose legitimately mentions validateDraft / delivery / etc. when describing what it must NOT do).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

// --- the new file exists --------------------------------------------------------------------------

test("the external-renderable admission file exists in application-orchestration/application", () => {
  assert.equal(existsSync(admissionPath), true, "expected application-orchestration/application/external-renderable-admission.ts");
});

// --- AC20 remains intact (re-asserted) ------------------------------------------------------------

test("AC20 intact: no new top-level module beyond the nine allowlisted + __tests__", () => {
  const ALLOWED = new Set([
    "observation", "reasoning", "understanding", "decision-support", "athlete",
    "event-recording", "rendering", "delivery", "application-orchestration", "__tests__",
  ]);
  for (const e of readdirSync(modulesDir).filter((x) => statSync(join(modulesDir, x)).isDirectory())) {
    assert.ok(ALLOWED.has(e), `unexpected top-level module '${e}' (AC20a)`);
  }
  assert.equal(existsSync(join(modulesDir, "reflection-composition")), false, "no reflection-composition module may exist");
});

test("AC20 intact: no production file imports all four core surfaces (no whole-core owner)", () => {
  const SURFACES = ["observation/index", "reasoning/index", "understanding/index", "decision-support/index"];
  for (const f of collectTsFiles(modulesDir).filter((x) => !x.includes("__tests__") && !x.endsWith(".test.ts") && !x.includes("/tests/"))) {
    const src = readFileSync(f, "utf8");
    assert.equal(SURFACES.every((s) => src.includes(s)), false, `production file ${f} must not compose all four cores`);
  }
});

// --- Impl 025 guard intact: application-orchestration imports no upstream domain module -------------

test("application-orchestration (incl. the admission file) imports no observation/reasoning/understanding/athlete", () => {
  for (const f of productionFiles(moduleDir)) {
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      assert.equal(
        /(^|\/)(observation|reasoning|understanding|athlete)\//.test(spec),
        false,
        `application-orchestration must not import an upstream domain module: ${spec} in ${f}`,
      );
    }
  }
});

// --- the admission file: rendering via public index only; no forbidden internals ------------------

test("the admission file imports rendering only via its public index, and no forbidden internals", () => {
  const src = readFileSync(admissionPath, "utf8");
  for (const spec of importSpecs(src)) {
    if (/(^|\/)(rendering|delivery|event-recording)\//.test(spec)) {
      assert.ok(/(rendering|delivery|event-recording)\/index\.ts$/.test(spec), `must import ${spec} only via its module index`);
    }
    assert.equal(/(^|\/)(observation|reasoning|understanding|athlete|delivery|event-recording)\//.test(spec), false, `must not import '${spec}'`);
  }
  // tokens assembled from fragments so this test is not itself a token site
  for (const forbidden of [
    "offline-reflection" + "-runtime",
    "orchestrate-render" + "-deliver",
    "live-provider-http" + "-transport",
    "live-provider" + "-client",
    "cloud-secret" + "-store-adapter",
    "process-environment-credential" + "-source-adapter",
    "reflection-" + "composition",
  ]) {
    assert.equal(src.includes(forbidden), false, `admission file must not reference '${forbidden}'`);
  }
});

// --- no process env, no provider call, no validateDraft, no delivery, no AthleteDecision -----------

test("the admission file reads no process environment and carries no vendor/SDK/network token", () => {
  const src = readFileSync(admissionPath, "utf8");
  assert.equal(ENV_TOKEN.test(src), false, "must contain no process-environment token");
  assert.equal(/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i.test(src), false, "no vendor/SDK/network token");
});

test("the admission file calls no provider, no validateDraft, no orchestration, no delivery", () => {
  const code = stripComments(readFileSync(admissionPath, "utf8")); // scan CODE only (prose may name these to forbid them)
  for (const forbidden of ["validateDraft", "requestRealProviderRendering", "orchestrateRenderDeliver", "render(", "FakeProviderClient", "LiveProviderClient", "DeliverySink", "deliver"]) {
    assert.equal(code.includes(forbidden), false, `admission file must not reference '${forbidden}'`);
  }
});

test("the admission file constructs no AthleteDecision and records no events", () => {
  const src = readFileSync(admissionPath, "utf8");
  for (const ctor of ["newAthleteDecisionId", "athleteDecision(", "AthleteDecision.", "recordAthleteDecisionRef", "EventEmitter", "event-recording"]) {
    assert.equal(src.includes(ctor), false, `admission file must not reference '${ctor}'`);
  }
});

// --- offlineReflectionRuntime is wired to the admission check (035-B) ------------------------------

test("offlineReflectionRuntime is wired to the admission check via the in-module import (035-B)", () => {
  const src = readFileSync(runtimePath, "utf8");
  // 035-B wires it: the runtime calls the admission check and carries the additive renderable-inadmissible status.
  assert.equal(src.includes("admitExternalRenderable"), true, "offlineReflectionRuntime must call the admission check (035-B)");
  assert.equal(src.includes("renderable-inadmissible"), true, "the runtime outcome union must carry the additive renderable-inadmissible status (035-B)");
  // it imports the check from the same module (not a new top-level module / not via a whole-core composer)
  for (const spec of importSpecs(src)) {
    if (spec.includes("external-renderable-admission")) {
      assert.ok(/^\.\/external-renderable-admission\.ts$/.test(spec), `must import the admission check from the same module: ${spec}`);
    }
  }
});

// --- no forbidden module/dir/script; operator + package unchanged ---------------------------------

test("no forbidden module/directory or script was created", () => {
  for (const forbidden of [
    join("modules", "reflection-composition"), join("modules", "api"), join("modules", "server"),
    join("modules", "ui"), join("modules", "frontend"), join("modules", "worker"), join("modules", "auth"),
    join("modules", "session"), join("modules", "db"), join("modules", "database"), join("modules", "migrations"),
    "api", "server", "ui", "frontend", "db", "database", "migrations",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
  const scriptsDir = join(repoRoot, "scripts");
  assert.equal(existsSync(join(scriptsDir, "external-renderable-admission.mjs")), false, "no external-renderable-admission.mjs script may exist");
  if (existsSync(scriptsDir)) {
    assert.deepEqual(readdirSync(scriptsDir).sort(), ["operator-live-smoke.mjs"], "scripts/ may contain only the approved operator script");
  }
});

test("the operator script is unchanged and does not reference the admission check", () => {
  const src = readFileSync(operatorScriptPath, "utf8");
  for (const sym of ["processEnvironmentCredentialSourceAdapter", "EnvironmentProviderCredentialResolver"]) {
    assert.equal(src.includes(sym), true, `operator script must still reference '${sym}'`);
  }
  assert.equal(src.includes("admitExternalRenderable"), false, "operator script must not reference the admission check");
});

test("no SDK / dependency / package-script change", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(value.includes("external-renderable"), false, `package script '${name}' must not invoke the admission check`);
  }
});

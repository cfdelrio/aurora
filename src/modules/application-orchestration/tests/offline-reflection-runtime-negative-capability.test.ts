// Implementation 032R-A — negative capability + boundary guards for the operator-mediated offline reflection
// runtime. The runtime is a PURE composition function: it imports no observation/reasoning/understanding/
// athlete module (manual intake is INJECTED), no live transport / credential resolver / process-env adapter /
// concrete provider / cloud-secret adapter / operator-smoke, reads no process environment, constructs no
// AthleteDecision, performs no delivery/event side effect, and adds no script/package script/new module.
// No forbidden directory was created. Operator smoke is unchanged. Negative tests are defining.

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
const runtimePath = join(moduleDir, "application", "offline-reflection-runtime.ts");
const operatorScriptPath = join(repoRoot, "scripts", "operator-live-smoke.mjs");

// build the process-env token indirectly so this test is not itself a token site
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

function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

// --- the new production file exists at the planned location ----------------------------------------

test("the offline reflection runtime file exists in application-orchestration/application", () => {
  assert.equal(existsSync(runtimePath), true, "expected application-orchestration/application/offline-reflection-runtime.ts");
});

// --- it reads no process environment ---------------------------------------------------------------

test("the offline reflection runtime reads no process environment", () => {
  assert.equal(ENV_TOKEN.test(readFileSync(runtimePath, "utf8")), false, "runtime must contain no process-environment token");
});

// --- it imports no upstream domain module (manual intake is INJECTED, generic) ---------------------

test("the offline reflection runtime imports no observation/reasoning/understanding/athlete module", () => {
  for (const spec of importSpecs(readFileSync(runtimePath, "utf8"))) {
    assert.equal(
      /(^|\/)(observation|reasoning|understanding|athlete)\//.test(spec),
      false,
      `runtime must not import an upstream domain module: ${spec}`,
    );
  }
});

// --- rendering imported only via its public index; no internal/infra imports ----------------------

test("the offline reflection runtime imports rendering only via its public index, and no forbidden internals", () => {
  const src = readFileSync(runtimePath, "utf8");
  for (const spec of importSpecs(src)) {
    if (/(^|\/)(rendering|delivery|event-recording)\//.test(spec)) {
      assert.ok(/(rendering|delivery|event-recording)\/index\.ts$/.test(spec), `must import ${spec} only via its module index`);
    }
  }
  // tokens assembled from fragments so this test is not itself a token site
  for (const forbidden of [
    "live-provider-http" + "-transport",
    "live-call" + "-policy",
    "credential" + "-resolver",
    "process-environment-credential" + "-source-adapter",
    "concrete-provider" + "-",
    "cloud-secret" + "-store-adapter",
    "operator-live" + "-smoke",
  ]) {
    assert.equal(src.includes(forbidden), false, `runtime must not reference internal '${forbidden}'`);
  }
});

// --- it constructs no AthleteDecision (only invites one) ------------------------------------------

test("the offline reflection runtime constructs no AthleteDecision", () => {
  const src = readFileSync(runtimePath, "utf8");
  // construction patterns only — the words 'AthleteDecision' appear in comments, but never as construction.
  for (const ctor of ["newAthleteDecisionId", "athleteDecision(", "AthleteDecision.from", "AthleteDecision.reconstitute", "new AthleteDecision"]) {
    assert.equal(src.includes(ctor), false, `runtime must not construct an AthleteDecision via '${ctor}'`);
  }
});

// --- it performs no delivery / event side effect (no such imports) --------------------------------

test("the offline reflection runtime imports no delivery or event-recording module (no delivery/event side effect)", () => {
  for (const spec of importSpecs(readFileSync(runtimePath, "utf8"))) {
    assert.equal(/(^|\/)(delivery|event-recording)\//.test(spec), false, `runtime must not import a delivery/event module: ${spec}`);
  }
});

// --- no vendor / SDK / network / retry token ------------------------------------------------------

test("the offline reflection runtime carries no vendor / SDK / network / retry token", () => {
  const src = readFileSync(runtimePath, "utf8");
  assert.equal(/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i.test(src), false, "no vendor/SDK/network token");
  assert.equal(/\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i.test(src), false, "no retry/scheduler primitive");
});

// --- no forbidden runtime / infra module or directory was created ---------------------------------

test("no forbidden runtime / api / ui / worker / auth / db module or directory was created", () => {
  for (const forbidden of [
    join("modules", "runtime"), join("modules", "api"), join("modules", "server"), join("modules", "ui"),
    join("modules", "frontend"), join("modules", "worker"), join("modules", "auth"), join("modules", "session"),
    join("modules", "db"), join("modules", "database"), join("modules", "migrations"),
    "api", "server", "ui", "frontend", "db", "database", "migrations", "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

// --- no runtime script + operator smoke unchanged -------------------------------------------------

test("no offline-reflection-runtime script exists; scripts/ holds only the approved operator script", () => {
  const scriptsDir = join(repoRoot, "scripts");
  assert.equal(existsSync(join(scriptsDir, "offline-reflection-runtime.mjs")), false, "no offline-reflection-runtime.mjs script may exist");
  if (existsSync(scriptsDir)) {
    assert.deepEqual(readdirSync(scriptsDir).sort(), ["operator-live-smoke.mjs"], "scripts/ may contain only the approved operator script");
  }
  assert.equal(existsSync(join(srcDir, "scripts")), false, "no scripts/ directory may exist inside src/");
});

test("the operator script is unchanged and does not reference the offline reflection runtime", () => {
  assert.equal(existsSync(operatorScriptPath), true, "expected scripts/operator-live-smoke.mjs");
  const src = readFileSync(operatorScriptPath, "utf8");
  for (const sym of ["processEnvironmentCredentialSourceAdapter", "EnvironmentProviderCredentialResolver"]) {
    assert.equal(src.includes(sym), true, `operator script must still reference '${sym}'`);
  }
  for (const sym of ["offlineReflectionRuntime", "OfflineReflectionRuntime"]) {
    assert.equal(src.includes(sym), false, `operator script must not reference '${sym}'`);
  }
});

// --- no SDK / dependency / package-script change --------------------------------------------------

test("no SDK / dependency change and no new package script", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(value.includes("offline-reflection"), false, `package script '${name}' must not invoke the offline runtime`);
  }
});

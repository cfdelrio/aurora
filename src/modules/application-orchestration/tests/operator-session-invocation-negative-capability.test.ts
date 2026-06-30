// Implementation 041-A — negative capability + boundary guards for the production operator invocation helper.
// invokeOperatorSession is a THIN async function: it imports only offlineReflectionRuntime + toOperatorSessionEnvelope
// (and their types); it imports no observation/reasoning/understanding/athlete module, no provider/live transport,
// no delivery/event implementation, no secret resolver / cloud adapter; it reads no process.env; it constructs no
// AthleteDecision and records no event; it returns ONLY the envelope (never the raw outcome); and it adds no
// script/package/new module. Negative tests are defining.

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
const helperPath = join(moduleDir, "application", "operator-session-invocation.ts");
const runtimePath = join(moduleDir, "application", "offline-reflection-runtime.ts");
const envelopePath = join(moduleDir, "application", "operator-session-envelope.ts");
const operatorScriptPath = join(repoRoot, "scripts", "operator-live-smoke.mjs");

// build the process-env token indirectly so this test is not itself a token site
const ENV_TOKEN = new RegExp("process" + "\\s*\\.\\s*env", "i");

function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// --- the helper file exists at the planned location -----------------------------------------------

test("the operator session invocation helper file exists in application-orchestration/application", () => {
  assert.equal(existsSync(helperPath), true, "expected application-orchestration/application/operator-session-invocation.ts");
});

// --- it imports only the runtime + the mapper (+ their types), and no upstream core ----------------

test("the helper imports only offlineReflectionRuntime + toOperatorSessionEnvelope (and types), no upstream core", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  for (const spec of importSpecs(code)) {
    assert.equal(
      /(^|\/)(observation|reasoning|understanding|athlete)\//.test(spec),
      false,
      `helper must not import an upstream domain module: ${spec}`,
    );
    assert.equal(/(^|\/)(delivery|event-recording)\//.test(spec), false, `helper must not import delivery/event: ${spec}`);
    assert.equal(/(^|\/)rendering\//.test(spec), false, `helper must not import rendering: ${spec}`);
    // every import must be a local application-orchestration application file
    assert.ok(
      spec.startsWith("./offline-reflection-runtime") || spec.startsWith("./operator-session-envelope"),
      `helper may import only the runtime + envelope mapper; saw ${spec}`,
    );
  }
});

// --- it reads no process environment ---------------------------------------------------------------

test("the helper reads no process environment", () => {
  assert.equal(ENV_TOKEN.test(readFileSync(helperPath, "utf8")), false, "helper must contain no process-environment token");
});

// --- it references no provider / live / secret internal --------------------------------------------

test("the helper references no provider/live transport, delivery sink, or secret/cloud adapter", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  for (const forbidden of [
    "live-provider-http" + "-transport",
    "live-call" + "-policy",
    "credential" + "-resolver",
    "process-environment-credential" + "-source-adapter",
    "concrete-provider" + "-",
    "cloud-secret" + "-store-adapter",
    "operator-live" + "-smoke",
    "DeliverySink",
    "deliver(",
  ]) {
    assert.equal(code.includes(forbidden), false, `helper must not reference internal '${forbidden}'`);
  }
});

// --- it returns ONLY the envelope: it never returns the raw outcome --------------------------------

test("the helper returns only the envelope — it never returns the raw runtime outcome", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  assert.ok(code.includes("toOperatorSessionEnvelope("), "helper must map through toOperatorSessionEnvelope");
  // no `return outcome` and no tuple/object exposing the raw outcome
  assert.equal(/return\s+outcome\b/.test(code), false, "helper must not return the raw outcome");
  assert.equal(/return\s*\{[^}]*\boutcome\b/.test(code), false, "helper must not return an object exposing the raw outcome");
});

// --- it constructs no AthleteDecision and records no event ----------------------------------------

test("the helper constructs no AthleteDecision and records no event", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  for (const ctor of ["newAthleteDecisionId", "athleteDecision(", "new AthleteDecision", "recordAthleteDecision("]) {
    assert.equal(code.includes(ctor), false, `helper must not construct/record an AthleteDecision via '${ctor}'`);
  }
  for (const ev of ["recordEvent", "DomainEventRecord", "eventRecorder", "emit("]) {
    assert.equal(code.includes(ev), false, `helper must not record an event via '${ev}'`);
  }
});

// --- it assembles no whole-core chain / no renderable --------------------------------------------

test("the helper assembles nothing (no renderable / whole-core composition)", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  for (const sym of ["renderableFromTerminalOutput", "evaluateDecisionSupportCase", "detectSignals", "openHypothesis"]) {
    assert.equal(code.includes(sym), false, `helper must not assemble via '${sym}'`);
  }
});

// --- no vendor / SDK / network / retry token ------------------------------------------------------

test("the helper carries no vendor / SDK / network / retry token", () => {
  const code = stripComments(readFileSync(helperPath, "utf8"));
  assert.equal(/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i.test(code), false, "no vendor/SDK/network token");
  assert.equal(/\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i.test(code), false, "no retry/scheduler primitive");
});

// --- no forbidden runtime / infra module or directory was created ---------------------------------

test("no forbidden runtime / api / ui / worker / auth / db / session module or directory was created", () => {
  for (const forbidden of [
    join("modules", "runtime"), join("modules", "api"), join("modules", "server"), join("modules", "ui"),
    join("modules", "frontend"), join("modules", "worker"), join("modules", "auth"), join("modules", "session"),
    join("modules", "db"), join("modules", "database"), join("modules", "migrations"),
    "api", "server", "ui", "frontend", "db", "database", "migrations", "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

// --- runtime + envelope mapper unchanged (the helper is a separate file) ---------------------------

test("offlineReflectionRuntime and the envelope mapper still exist and are separate files", () => {
  assert.equal(existsSync(runtimePath), true, "offlineReflectionRuntime must still exist");
  assert.equal(existsSync(envelopePath), true, "operator-session-envelope must still exist");
  const code = stripComments(readFileSync(helperPath, "utf8"));
  assert.ok(code.includes("offlineReflectionRuntime("), "helper invokes the runtime");
});

// --- no runtime script + operator smoke unchanged -------------------------------------------------

test("no invocation script exists; scripts/ holds only the approved operator script", () => {
  const scriptsDir = join(repoRoot, "scripts");
  assert.equal(existsSync(join(scriptsDir, "operator-session-invocation.mjs")), false, "no invocation script may exist");
  if (existsSync(scriptsDir)) {
    assert.deepEqual(readdirSync(scriptsDir).sort(), ["operator-live-smoke.mjs"], "scripts/ may contain only the approved operator script");
  }
});

test("the operator script is unchanged and does not reference the invocation helper", () => {
  assert.equal(existsSync(operatorScriptPath), true, "expected scripts/operator-live-smoke.mjs");
  const src = readFileSync(operatorScriptPath, "utf8");
  for (const sym of ["invokeOperatorSession"]) {
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
    assert.equal(value.includes("operator-session-invocation"), false, `package script '${name}' must not invoke the helper`);
  }
});

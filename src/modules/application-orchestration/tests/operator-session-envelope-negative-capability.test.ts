// Implementation 040-A — negative capability + boundary guards for the operator session envelope mapper.
// The mapper is a PURE, SYNCHRONOUS whitelist projection: it imports no observation/reasoning/understanding/
// athlete module, no provider/live transport, no delivery/event implementation, no secret resolver / cloud
// adapter; it reads no process environment; it calls no offlineReflectionRuntime / orchestrateRenderDeliver /
// validateDraft; it constructs no AthleteDecision and records no event; and it adds no script/package/new module.
// Negative tests are defining.

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
const envelopePath = join(moduleDir, "application", "operator-session-envelope.ts");
const runtimePath = join(moduleDir, "application", "offline-reflection-runtime.ts");
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

// strip line + block comments so guards scan CODE only (the file's banner names forbidden concepts on purpose)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// --- the new production file exists at the planned location ----------------------------------------

test("the operator session envelope file exists in application-orchestration/application", () => {
  assert.equal(existsSync(envelopePath), true, "expected application-orchestration/application/operator-session-envelope.ts");
});

// --- it reads no process environment ---------------------------------------------------------------

test("the envelope mapper reads no process environment", () => {
  assert.equal(ENV_TOKEN.test(readFileSync(envelopePath, "utf8")), false, "mapper must contain no process-environment token");
});

// --- it imports no upstream domain module ----------------------------------------------------------

test("the envelope mapper imports no observation/reasoning/understanding/athlete module", () => {
  for (const spec of importSpecs(readFileSync(envelopePath, "utf8"))) {
    assert.equal(
      /(^|\/)(observation|reasoning|understanding|athlete)\//.test(spec),
      false,
      `mapper must not import an upstream domain module: ${spec}`,
    );
  }
});

// --- it imports no delivery / event-recording / provider transport / secret adapter ---------------

test("the envelope mapper imports no delivery / event-recording / provider / secret module", () => {
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  for (const spec of importSpecs(code)) {
    assert.equal(/(^|\/)(delivery|event-recording)\//.test(spec), false, `mapper must not import a delivery/event module: ${spec}`);
    assert.equal(/(^|\/)rendering\//.test(spec), false, `mapper must not import rendering internals: ${spec}`);
  }
  for (const forbidden of [
    "live-provider-http" + "-transport",
    "live-call" + "-policy",
    "credential" + "-resolver",
    "process-environment-credential" + "-source-adapter",
    "concrete-provider" + "-",
    "cloud-secret" + "-store-adapter",
    "operator-live" + "-smoke",
  ]) {
    assert.equal(code.includes(forbidden), false, `mapper must not reference internal '${forbidden}'`);
  }
});

// --- it invokes nothing: no runtime / orchestration / validateDraft call ---------------------------

test("the envelope mapper invokes no runtime / orchestration / validator (it only narrows an outcome)", () => {
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  for (const call of ["offlineReflectionRuntime(", "orchestrateRenderDeliver(", "validateDraft(", "admitExternalRenderable("]) {
    assert.equal(code.includes(call), false, `mapper must not call '${call}'`);
  }
});

// --- it constructs no AthleteDecision and records no event ----------------------------------------

test("the envelope mapper constructs no AthleteDecision and records no event", () => {
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  for (const ctor of ["newAthleteDecisionId", "athleteDecision(", "AthleteDecision.from", "AthleteDecision.reconstitute", "new AthleteDecision", "recordAthleteDecision("]) {
    assert.equal(code.includes(ctor), false, `mapper must not construct/record an AthleteDecision via '${ctor}'`);
  }
  for (const ev of ["recordEvent", "DomainEventRecord", "eventRecorder", "emit("]) {
    assert.equal(code.includes(ev), false, `mapper must not record an event via '${ev}'`);
  }
});

// --- it never spreads the raw outcome (whitelist construction) ------------------------------------

test("the envelope mapper never spreads the raw outcome", () => {
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  assert.equal(/\.\.\.\s*outcome\b/.test(code), false, "mapper must not spread the raw outcome ({ ...outcome })");
});

// --- no vendor / SDK / network / retry / async token ----------------------------------------------

test("the envelope mapper carries no vendor / SDK / network / retry token and is synchronous", () => {
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  assert.equal(/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i.test(code), false, "no vendor/SDK/network token");
  assert.equal(/\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i.test(code), false, "no retry/scheduler primitive");
  assert.equal(/\b(async|await)\b/.test(code), false, "mapper must be synchronous (no async/await)");
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

// --- offlineReflectionRuntime unchanged (the mapper does not touch it) -----------------------------

test("offlineReflectionRuntime still exists and the envelope mapper is a separate file", () => {
  assert.equal(existsSync(runtimePath), true, "offlineReflectionRuntime must still exist");
  // the mapper imports only TYPES from the runtime file, never its function
  const code = stripComments(readFileSync(envelopePath, "utf8"));
  assert.ok(/import\s+type\s+\{[^}]*\}\s+from\s+["']\.\/offline-reflection-runtime\.ts["']/.test(code), "mapper imports types only from the runtime");
});

// --- no runtime script + operator smoke unchanged -------------------------------------------------

test("no envelope script exists; scripts/ holds only the approved operator script", () => {
  const scriptsDir = join(repoRoot, "scripts");
  assert.equal(existsSync(join(scriptsDir, "operator-session-envelope.mjs")), false, "no envelope script may exist");
  if (existsSync(scriptsDir)) {
    assert.deepEqual(readdirSync(scriptsDir).sort(), ["operator-live-smoke.mjs", "operator-runtime-executable.mjs"], "scripts/ may contain only the approved operator script");
  }
});

test("the operator script is unchanged and does not reference the envelope", () => {
  assert.equal(existsSync(operatorScriptPath), true, "expected scripts/operator-live-smoke.mjs");
  const src = readFileSync(operatorScriptPath, "utf8");
  for (const sym of ["toOperatorSessionEnvelope", "OperatorSessionEnvelope"]) {
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
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(value.includes("operator-session-envelope"), false, `package script '${name}' must not invoke the envelope`);
  }
});

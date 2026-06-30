// Implementation 027 — negative capability for the operator live-smoke entrypoint. The PURE `src` support helper
// reads no process environment and imports nothing side-effecting; the executable `scripts/operator-live-smoke.mjs`
// is a thin adapter that calls liveProviderSmoke through the existing public surfaces, uses the approved credential
// chain, imports no delivery/event-recording/application-orchestration, prints only redacted output, adds no
// dependency, and is not wired into package scripts. Negative tests are defining.

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
const helperPath = join(renderingDir, "application", "operator-live-smoke-entrypoint.ts");
const scriptPath = join(repoRoot, "scripts", "operator-live-smoke.mjs");

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

// tokens assembled from fragments so this test file is not itself a token site under any production scan
const ENV_TOKEN = new RegExp("process" + "\\s*\\.\\s*env", "i");

// --- the pure src support helper -------------------------------------------------------------------

test("the operator support helper exists in rendering/application", () => {
  assert.equal(existsSync(helperPath), true, "expected src/modules/rendering/application/operator-live-smoke-entrypoint.ts");
});

test("the support helper reads no process environment and carries no network/vendor token", () => {
  const src = readFileSync(helperPath, "utf8");
  assert.equal(ENV_TOKEN.test(src), false, "support helper must contain no process-environment token");
  const networkOrVendor = /\b(openai|anthropic|axios)\b|\bnode:https?\b|fetch\s*\(|https?:\/\//i;
  assert.equal(networkOrVendor.test(src), false, "support helper must contain no network/vendor token");
});

test("the support helper imports nothing side-effecting (no transport/adapter/concrete/delivery/event/orchestration/domain)", () => {
  const src = readFileSync(helperPath, "utf8");
  for (const spec of importSpecs(src)) {
    assert.equal(
      /(^|\/)(delivery|event-recording|application-orchestration|observation|reasoning|understanding|athlete)(\/|$)/.test(spec),
      false,
      `support helper must not import a forbidden module: ${spec}`,
    );
    for (const forbidden of ["live-provider-http-transport", "process-environment-credential-source-adapter", "concrete-provider"]) {
      assert.equal(spec.includes(forbidden), false, `support helper must not import '${forbidden}': ${spec}`);
    }
  }
});

// --- the executable .mjs script --------------------------------------------------------------------

test("the operator script exists at scripts/operator-live-smoke.mjs", () => {
  assert.equal(existsSync(scriptPath), true, "expected scripts/operator-live-smoke.mjs");
});

test("the script calls liveProviderSmoke and uses the pure support helpers (thin adapter, no duplicated semantics)", () => {
  const src = readFileSync(scriptPath, "utf8");
  for (const sym of ["liveProviderSmoke", "parseOperatorSmokeEnv", "syntheticSmokeRenderingRequest", "operatorSmokeOutput", "operatorSmokeExitCode"]) {
    assert.equal(src.includes(sym), true, `script must reference '${sym}'`);
  }
});

test("the script uses the approved credential adapter/resolver chain", () => {
  const src = readFileSync(scriptPath, "utf8");
  for (const sym of ["processEnvironmentCredentialSourceAdapter", "EnvironmentProviderCredentialResolver", "APPROVED_PROVIDER_CREDENTIAL_KEY"]) {
    assert.equal(src.includes(sym), true, `script must use approved credential symbol '${sym}'`);
  }
});

test("the script imports only the rendering public surface (no delivery/event-recording/application-orchestration/upstream-domain)", () => {
  for (const spec of importSpecs(readFileSync(scriptPath, "utf8"))) {
    assert.equal(
      /(delivery|event-recording|application-orchestration|observation|reasoning|understanding|athlete)\//.test(spec),
      false,
      `script must not import a forbidden module: ${spec}`,
    );
  }
});

test("the script introduces no retry / loop / scheduler construct", () => {
  const src = readFileSync(scriptPath, "utf8");
  const loopOrRetry = /\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b|\bwhile\s*\(|\bfor\s*\(/i;
  assert.equal(loopOrRetry.test(src), false, "script must contain no retry/loop/scheduler construct");
});

test("the script emits no raw env dump and writes only the redacted operator output", () => {
  const src = readFileSync(scriptPath, "utf8");
  // no environment dump
  assert.equal(/JSON\.stringify\(\s*process\s*\.\s*env/i.test(src), false, "script must not stringify the environment");
  // the single stdout write carries operatorSmokeOutput(...) only
  const writes = src.match(/stdout\s*\.\s*write\s*\(/g) ?? [];
  assert.equal(writes.length, 1, "script must write to stdout exactly once");
  assert.ok(/stdout\s*\.\s*write\([^\n]*operatorSmokeOutput\(/.test(src), "the stdout write must carry operatorSmokeOutput(...)");
});

// --- structure / package ---------------------------------------------------------------------------

test("the operator script is NOT referenced by any package.json script", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(value.includes("operator-live-smoke"), false, `package script '${name}' must not invoke the operator entrypoint`);
  }
});

test("no event-bus / queue / scheduler / retry / telemetry / evaluation / provider / llm module and no api/db layer was created", () => {
  for (const forbidden of [
    join("modules", "workflow"), join("modules", "orchestrator"), join("modules", "event-bus"),
    join("modules", "events-bus"), join("modules", "queue"), join("modules", "scheduler"),
    join("modules", "retry"), join("modules", "telemetry"), join("modules", "evaluation"),
    join("modules", "provider"), join("modules", "llm"),
    "api", "infrastructure", "db", "database", "migrations",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no new process-environment token leaked into production src (the seal stays intact)", () => {
  const productionFiles = collectTsFiles(srcDir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/"));
  const withToken = productionFiles.filter((f) => ENV_TOKEN.test(readFileSync(f, "utf8"))).map((f) => f.split("/").pop());
  assert.deepEqual(withToken, ["process-environment-credential-source-adapter.ts"], "process.env must remain in exactly the approved adapter file");
});

test("no SDK / dependency change", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
});

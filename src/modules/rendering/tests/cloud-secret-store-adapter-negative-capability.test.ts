// Implementation 029 — negative capability + boundary guards for the cloud-secret adapter contract layer.
// The new file reads no process environment, imports no cloud SDK / delivery / event-recording /
// application-orchestration / upstream-domain module, names no cloud provider, carries no network/vendor
// token, introduces no dependency, and is imported by no module outside rendering. No forbidden module was
// created. The process-env one-file seal remains intact. The operator script is unchanged and does not
// reference the cloud adapter. Negative tests are defining.

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
const adapterPath = join(renderingDir, "application", "cloud-secret-store-adapter.ts");
const scriptPath = join(repoRoot, "scripts", "operator-live-smoke.mjs");

// build the token regex indirectly so this test file is not itself a token site under any production scan
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

function productionFiles(): string[] {
  return collectTsFiles(srcDir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/"));
}

// --- the new production file exists and is in the correct location ---------------------------------

test("the cloud-secret adapter file exists in rendering/application", () => {
  assert.equal(existsSync(adapterPath), true, "expected src/modules/rendering/application/cloud-secret-store-adapter.ts");
});

// --- no process-environment token in the new file --------------------------------------------------

test("the cloud-secret adapter reads no process environment", () => {
  const src = readFileSync(adapterPath, "utf8");
  assert.equal(ENV_TOKEN.test(src), false, "cloud-secret adapter must contain no process-environment token");
});

// the repo-wide seal: exactly ONE production file may contain the process-env token.
test("the process-environment seal remains intact: token still in exactly the approved adapter file", () => {
  const withToken = productionFiles()
    .filter((f) => ENV_TOKEN.test(readFileSync(f, "utf8")))
    .map((f) => f.split("/").pop());
  assert.deepEqual(withToken, ["process-environment-credential-source-adapter.ts"], "process.env must remain in exactly the approved adapter file");
});

// --- no vendor / SDK / network / retry token -------------------------------------------------------

test("the cloud-secret adapter carries no vendor / SDK / network / retry token", () => {
  const src = readFileSync(adapterPath, "utf8");
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\//i;
  assert.equal(forbidden.test(src), false, "cloud-secret adapter must contain no vendor/SDK/network token");
  const retryOrScheduler = /\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i;
  assert.equal(retryOrScheduler.test(src), false, "cloud-secret adapter must contain no retry/scheduler primitive");
});

// --- no concrete cloud provider name / endpoint / SDK ----------------------------------------------

test("the cloud-secret adapter names no concrete cloud provider, endpoint, or cloud SDK", () => {
  const src = readFileSync(adapterPath, "utf8").toLowerCase();
  for (const cloudToken of [
    "amazonaws.com", "googleapis.com", "azure.com", "hashicorp", "vault",
    "@aws-sdk", "@google-cloud", "@azure/", "aws-sdk", "secretsmanager", "secret-manager",
    "keyvault", "key vault", "gcp ", "boto",
  ]) {
    assert.equal(src.includes(cloudToken), false, `cloud-secret adapter must not reference '${cloudToken}'`);
  }
});

// --- no forbidden module import in the new file ----------------------------------------------------

test("the cloud-secret adapter imports no delivery / event-recording / application-orchestration / upstream-domain module", () => {
  const src = readFileSync(adapterPath, "utf8");
  for (const spec of importSpecs(src)) {
    assert.equal(
      /(^|\/)(delivery|event-recording|application-orchestration|observation|reasoning|understanding|athlete)(\/|$)/.test(spec),
      false,
      `cloud-secret adapter must not import a forbidden module: ${spec}`,
    );
    for (const forbidden of ["live-provider-http-transport", "process-environment-credential-source-adapter", "concrete-provider", "live-provider-client"]) {
      assert.equal(spec.includes(forbidden), false, `cloud-secret adapter must not import '${forbidden}': ${spec}`);
    }
  }
});

// --- no module outside rendering imports the new symbols -------------------------------------------

const CLOUD_SYMBOLS = [
  "CloudSecretStoreAdapter",
  "FakeCloudSecretValueClient",
  "CloudSecretValueClient",
  "CloudSecretRef",
  "CloudSecretLookupResult",
  "CloudSecretAdapterFailureCode",
  "CloudSecretClientScenario",
  "CloudSecretStoreAdapterConfig",
];

test("no module outside rendering imports the cloud-secret adapter symbols", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery", "application-orchestration"]) {
    const modDir = join(modulesDir, mod);
    if (!existsSync(modDir)) continue;
    for (const f of collectTsFiles(modDir)) {
      const fileSrc = readFileSync(f, "utf8");
      for (const sym of CLOUD_SYMBOLS) {
        assert.equal(fileSrc.includes(sym), false, `${mod} must not reference cloud-secret symbol '${sym}': ${f}`);
      }
    }
  }
});

// --- no forbidden module / directory was created ---------------------------------------------------

test("no forbidden secret-manager / infrastructure / cloud / event-bus / scheduler / evaluation module was created", () => {
  for (const forbidden of [
    join("modules", "secrets"), join("modules", "secret-manager"), join("modules", "infrastructure"),
    join("modules", "aws"), join("modules", "gcp"), join("modules", "azure"),
    join("modules", "workflow"), join("modules", "orchestrator"), join("modules", "event-bus"),
    join("modules", "events-bus"), join("modules", "queue"), join("modules", "scheduler"),
    join("modules", "retry"), join("modules", "telemetry"), join("modules", "evaluation"),
    join("modules", "provider"), join("modules", "llm"), join("modules", "openai"), join("modules", "anthropic"),
    "api", "infrastructure", "db", "database", "migrations", "ui", "providers", "prompts",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

// --- no SDK / dependency change --------------------------------------------------------------------

test("no SDK / dependency change: devDependencies remain only typescript + @types/node", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true, "no runtime dependency may be added");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "typescript"], "devDependencies must remain only typescript + @types/node");
});

// --- operator script is unchanged and does not reference the cloud adapter -------------------------

test("the operator script is unchanged: still references only the approved credential chain, not the cloud adapter", () => {
  assert.equal(existsSync(scriptPath), true, "expected scripts/operator-live-smoke.mjs");
  const src = readFileSync(scriptPath, "utf8");
  for (const sym of ["processEnvironmentCredentialSourceAdapter", "EnvironmentProviderCredentialResolver"]) {
    assert.equal(src.includes(sym), true, `operator script must still reference approved symbol '${sym}'`);
  }
  assert.equal(src.includes("ManagedSecretCredentialSource"), false, "operator script must not reference ManagedSecretCredentialSource");
  for (const sym of CLOUD_SYMBOLS) {
    assert.equal(src.includes(sym), false, `operator script must not reference cloud-secret symbol '${sym}' in Impl 029`);
  }
});

test("the cloud adapter introduces no npm script reference in package.json", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(value.includes("operator-live-smoke"), false, `package script '${name}' must not invoke the operator entrypoint`);
    assert.equal(value.includes("cloud-secret"), false, `package script '${name}' must not invoke a cloud-secret entrypoint`);
  }
});

// --- the cloud adapter adds no persistence / event / delivery / domain surface --------------------

test("the cloud-secret adapter contains no event / delivery / persistence / domain mutation reference", () => {
  const src = readFileSync(adapterPath, "utf8");
  for (const forbidden of ["EventEmitter", "event-recording", "delivery", "orchestrat", "validateDraft", "RenderedMessage", "athlete", "decision"]) {
    assert.equal(src.toLowerCase().includes(forbidden.toLowerCase()), false, `cloud-secret adapter must not reference '${forbidden}'`);
  }
});

// --- structural: scripts/ unchanged ----------------------------------------------------------------

test("no operator script directory exists inside src/", () => {
  assert.equal(existsSync(join(srcDir, "scripts")), false, "no scripts/ directory may exist inside src/");
});

test("scripts/ at repo root contains only the approved operator-live-smoke.mjs", () => {
  const scriptsDir = join(repoRoot, "scripts");
  if (existsSync(scriptsDir)) {
    assert.deepEqual(
      readdirSync(scriptsDir).sort(),
      ["operator-live-smoke.mjs"],
      "scripts/ may contain only the approved operator-live-smoke.mjs",
    );
  }
});

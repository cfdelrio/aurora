// Implementation 026 — negative capability for the opt-in live-provider smoke boundary. The helper is an
// operational wiring check, fully injected: it reads no process environment, imports no transport / environment
// adapter / concrete-provider internal / delivery / event-recording / application-orchestration / upstream-domain
// module, carries no network/vendor/secret/retry token, is imported by no module outside rendering, and returns a
// redacted result. It adds no module and no dependency. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { liveProviderSmoke, FakeProviderClient, LiveCallPolicy, StaticProviderCredentialResolver } from "../index.ts";
import type { ProviderClientConfig } from "../index.ts";
import { req, supportRenderable } from "./fixtures.ts";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const renderingDir = join(here, ".."); // rendering
const modulesDir = join(renderingDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src
const repoRoot = join(srcDir, ".."); // repo root
const helperPath = join(renderingDir, "application", "live-provider-smoke.ts");

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

test("the live-provider smoke helper file exists", () => {
  assert.equal(existsSync(helperPath), true, "expected src/modules/rendering/application/live-provider-smoke.ts");
});

test("the helper imports no delivery / event-recording / application-orchestration / upstream-domain module", () => {
  for (const spec of importSpecs(readFileSync(helperPath, "utf8"))) {
    assert.equal(
      /(^|\/)(delivery|event-recording|application-orchestration|observation|reasoning|understanding|athlete)(\/|$)/.test(spec),
      false,
      `helper must not import a forbidden module: ${spec}`,
    );
  }
});

test("the helper imports no live HTTP transport / process-environment adapter / concrete-provider internal", () => {
  const src = readFileSync(helperPath, "utf8");
  for (const spec of importSpecs(src)) {
    for (const forbidden of [
      "live-provider-http-transport",
      "process-environment-credential-source-adapter",
      "concrete-provider",
    ]) {
      assert.equal(spec.includes(forbidden), false, `helper must not import '${forbidden}': ${spec}`);
    }
  }
  // it composes the live client through the injected boundary; it does not import the live client / transport factory
  for (const sym of ["liveProviderHttpTransport", "LiveProviderClient", "orchestrateRenderDeliver"]) {
    assert.equal(src.includes(sym), false, `helper must not reference '${sym}'`);
  }
});

test("the helper carries no network / vendor / process-environment token", () => {
  const src = readFileSync(helperPath, "utf8");
  const networkOrVendor = /\b(openai|anthropic|axios)\b|\bnode:https?\b|fetch\s*\(|https?:\/\//i;
  assert.equal(networkOrVendor.test(src), false, "helper must contain no network/vendor token");
  assert.equal(ENV_TOKEN.test(src), false, "helper must contain no process-environment token");
});

test("the helper introduces no retry / scheduler primitive", () => {
  const src = readFileSync(helperPath, "utf8");
  const schedRetry = /\b(setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler)\b|\bretr(y|ies)\b/i;
  assert.equal(schedRetry.test(src), false, "helper must contain no retry/scheduler primitive");
});

test("no module outside rendering imports the live-provider smoke helper", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery", "application-orchestration"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      assert.equal(
        readFileSync(f, "utf8").includes("liveProviderSmoke"),
        false,
        `${mod} must not reference liveProviderSmoke: ${f}`,
      );
    }
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

test("no operator script was added under scripts/", () => {
  // Implementation 026 ships the pure helper only; the operator script is deferred (Tech Spec 026A §14).
  assert.equal(existsSync(join(repoRoot, "scripts")), false, "no scripts/ directory should exist in this slice");
});

test("the redacted smoke result contains no raw draft/prompt/payload/response/secret/env value/rendered body", async () => {
  const config: ProviderClientConfig = { providerKind: "live" };
  const request = req(supportRenderable());
  for (const scenario of ["safe", "voice-escalating", "unavailable"] as const) {
    const out = await liveProviderSmoke(
      { optIn: true, ci: false, request },
      {
        client: new FakeProviderClient({ scenario }),
        policy: LiveCallPolicy.enabled(),
        resolver: new StaticProviderCredentialResolver({ status: "available" }),
        config,
      },
    );
    const json = JSON.stringify(out).toLowerCase();
    for (const banned of ["energy felt low", "reflecting on what we have", "you should", "ref:live", "opaque:", "bearer", "secret", "apikey"]) {
      assert.equal(json.includes(banned), false, `result must not contain '${banned}' (scenario ${scenario})`);
    }
    assert.equal(ENV_TOKEN.test(JSON.stringify(out)), false, "result must contain no process-environment token");
  }
});

test("no SDK / dependency change", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true, "no runtime dependency may be added");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "typescript"], "devDependencies must remain only typescript + @types/node");
});

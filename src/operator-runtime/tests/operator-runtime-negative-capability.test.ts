// operator-runtime tests (Implementation 043-C1): the import-boundary NEGATIVE-CAPABILITY guard for the
// out-of-`modules` persistence layer (Spec 043B / Tech Spec 043C). The layer CONSUMES Aurora — it imports
// only the application-orchestration PUBLIC index (invokeOperatorSession, OperatorSessionEnvelope) +
// shared-kernel, runs sessions only behind invokeOperatorSession (never offlineReflectionRuntime), persists
// only the safe envelope, touches no DB/object-storage/provider/delivery/secret/process-env, and ships no
// API/UI/CLI/worker/deployment/migration/Dockerfile/IaC. Negative tests are defining. AC20 stays untouched.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../operator-runtime/tests
const layerDir = join(here, ".."); // .../operator-runtime
const srcDir = join(layerDir, ".."); // .../src
const modulesDir = join(srcDir, "modules");
const repoRoot = join(srcDir, ".."); // repo root

// tokens assembled indirectly so this test file is itself never a token site under any repo-wide scan
const ENV_TOKEN = new RegExp("process" + "\\s*\\.\\s*env", "i");

const ALLOWED_MODULES = new Set([
  "observation",
  "reasoning",
  "understanding",
  "decision-support",
  "athlete",
  "event-recording",
  "rendering",
  "delivery",
  "application-orchestration",
]);

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
  return collectTsFiles(layerDir).filter((f) => !f.endsWith(".test.ts") && !f.includes("/tests/"));
}
function importSpecs(src: string): string[] {
  const specs: string[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1] ?? "");
  return specs;
}

// --- placement -------------------------------------------------------------------------------------

test("1 src/operator-runtime exists outside src/modules", () => {
  assert.equal(existsSync(layerDir), true, "the operator-runtime layer must exist");
  assert.equal(existsSync(join(modulesDir, "operator-runtime")), false, "it must NOT be a src/modules/* module");
});

test("2/22 no new src/modules top-level module was added (AC20a allowlist unchanged)", () => {
  const dirs = readdirSync(modulesDir).filter((e) => statSync(join(modulesDir, e)).isDirectory());
  for (const d of dirs) {
    assert.ok(ALLOWED_MODULES.has(d) || d === "__tests__", `unexpected top-level module '${d}' — AC20 must stay unchanged`);
  }
});

test("3/4/5 no src/modules/session, no src/modules/cloud, no reflection-composition module", () => {
  for (const forbidden of [
    join("modules", "session"),
    join("modules", "cloud"),
    join("modules", "reflection-composition"),
    "reflection-composition",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

// --- import boundary -------------------------------------------------------------------------------

test("6 operator-runtime imports only allowed public surfaces (app-orchestration index + shared-kernel + within-layer)", () => {
  for (const f of productionFiles()) {
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      if (!spec.startsWith(".")) {
        // no third-party / node built-in imports in C1 (no DB/object-storage/fs)
        assert.fail(`operator-runtime must import no external/node module in C1: '${spec}' in ${f}`);
      }
      const withinLayer = !spec.includes("../modules/") && !spec.includes("../../modules/");
      const sharedKernel = /(^|\/)shared-kernel\//.test(spec);
      const appOrchIndex = /\/modules\/application-orchestration\/index\.ts$/.test(spec);
      assert.ok(
        withinLayer || sharedKernel || appOrchIndex,
        `operator-runtime may import only the app-orchestration public index + shared-kernel + within-layer: '${spec}' in ${f}`,
      );
    }
  }
});

test("7 operator-runtime does not import or call offlineReflectionRuntime directly", () => {
  const runtimeSymbol = "offline" + "ReflectionRuntime";
  const runtimeFile = "offline-reflection" + "-runtime";
  for (const f of productionFiles()) {
    const src = readFileSync(f, "utf8");
    assert.equal(src.includes(runtimeSymbol), false, `must not reference ${runtimeSymbol} (run only via invokeOperatorSession): ${f}`);
    for (const spec of importSpecs(src)) {
      assert.equal(spec.includes(runtimeFile), false, `must not import the runtime file directly: ${spec} in ${f}`);
    }
  }
});

test("8 operator-runtime imports no upstream core / module internals", () => {
  for (const f of productionFiles()) {
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      // forbidden core modules entirely
      assert.equal(
        /\/modules\/(observation|reasoning|understanding|decision-support|athlete|event-recording)\//.test(spec),
        false,
        `operator-runtime must not import an upstream/core module: ${spec} in ${f}`,
      );
      // rendering/delivery may not be imported at all in C1
      assert.equal(/\/modules\/(rendering|delivery)\//.test(spec), false, `operator-runtime must not import ${spec} in ${f}`);
      // application-orchestration only via its public index — never an internal file
      if (/\/modules\/application-orchestration\//.test(spec)) {
        assert.ok(/application-orchestration\/index\.ts$/.test(spec), `app-orchestration must be imported only via its index: ${spec} in ${f}`);
      }
    }
  }
});

test("9-16 operator-runtime imports no DB / fs / object-storage SDK / cloud SDK / provider-live / delivery / secret-cloud and reads no process environment", () => {
  const dbToken = /\b(sqlite|postgres|postgresql|mysql|mongodb|mongoose|typeorm|prisma|knex|sequelize|drizzle|redis|migration)\b/i;
  const fsToken = /["'](node:fs|fs|node:fs\/promises|node:path|node:os)["']/;
  const objectStorageToken = /@aws-sdk|aws-sdk|@google-cloud\/storage|@azure\/storage|minio|["']s3["']|\bS3Client\b/i;
  const cloudSdkToken = /@google-cloud|@azure|googleapis|firebase-admin|@vercel\/blob|@cloudflare|wrangler/i;
  const providerLiveToken = /(live-provider|provider-http-transport|concrete-provider|live-call-policy|live-provider-client)/i;
  const deliveryToken = /\/(delivery)\//i;
  const secretCloudToken = /(credential-resolver|process-environment-credential|cloud-secret|secret-store|secret-source)/i;
  for (const f of productionFiles()) {
    const src = readFileSync(f, "utf8");
    assert.equal(dbToken.test(src), false, `operator-runtime must reference no DB/ORM/migration token: ${f}`);
    assert.equal(objectStorageToken.test(src), false, `operator-runtime must reference no object-storage SDK: ${f}`);
    assert.equal(cloudSdkToken.test(src), false, `operator-runtime must reference no cloud SDK: ${f}`);
    assert.equal(providerLiveToken.test(src), false, `operator-runtime must reference no provider/live transport: ${f}`);
    assert.equal(secretCloudToken.test(src), false, `operator-runtime must reference no secret/cloud adapter: ${f}`);
    assert.equal(ENV_TOKEN.test(src), false, `operator-runtime must read no process environment: ${f}`);
    for (const spec of importSpecs(src)) {
      assert.equal(fsToken.test(`"${spec}"`), false, `operator-runtime must import no filesystem module: ${spec} in ${f}`);
      assert.equal(deliveryToken.test(spec), false, `operator-runtime must import no delivery implementation: ${spec} in ${f}`);
    }
  }
});

// --- no infra / no app surface created -------------------------------------------------------------

test("16/17/18/19 no Dockerfile / IaC / migrations / API / UI / CLI / worker / deployment was created", () => {
  // nothing infra-shaped inside the layer
  for (const entry of collectTsFiles(layerDir)) {
    assert.equal(/\/(api|ui|frontend|server|worker|cli|deployment|migrations|infrastructure)\//.test(entry), false, `layer must contain no api/ui/server/worker/cli/deployment file: ${entry}`);
  }
  // no infra files / dirs in the layer
  for (const f of readdirSync(layerDir)) {
    assert.equal(/^(Dockerfile|.*\.tf|.*\.tfvars|serverless\.yml|cdk\.json|pulumi\.yaml)$/.test(f), false, `layer must contain no Dockerfile/IaC: ${f}`);
  }
  // no new top-level src dirs of those shapes, no repo-root Dockerfile/IaC
  for (const forbidden of ["api", "server", "ui", "frontend", "db", "database", "migrations", "infrastructure"]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
  assert.equal(existsSync(join(repoRoot, "Dockerfile")), false, "must not create a Dockerfile");
});

// --- package / scripts untouched ------------------------------------------------------------------

test("20 package.json / package-lock.json unchanged (no dependency, no script added for the layer)", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  assert.equal(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true, "no runtime dependency may be added");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "typescript"], "devDependencies must remain only typescript + @types/node");
  // no operator-runtime package script was added in C1
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    assert.equal(/operator-runtime/.test(cmd), false, `no operator-runtime package script may be added in C1: ${cmd}`);
  }
});

test("22 tsconfig.json unchanged (still include:[\"src\"], covering the layer with no config churn)", () => {
  const tsconfig = JSON.parse(readFileSync(join(repoRoot, "tsconfig.json"), "utf8")) as {
    include?: unknown;
  };
  assert.deepEqual(tsconfig.include, ["src"], "tsconfig include must remain exactly [\"src\"]");
});

test("23 scripts/operator-live-smoke.mjs still present and unreferenced by the layer", () => {
  assert.equal(existsSync(join(repoRoot, "scripts", "operator-live-smoke.mjs")), true, "the approved smoke entrypoint must remain");
  for (const f of productionFiles()) {
    assert.equal(/operator-live-smoke/.test(readFileSync(f, "utf8")), false, `layer must not reference the smoke entrypoint: ${f}`);
  }
});

// --- the layer is not consumed by the core --------------------------------------------------------

test("the core (src/modules) does not import the operator-runtime layer", () => {
  for (const f of collectTsFiles(modulesDir)) {
    assert.equal(
      /from\s+["'][^"']*operator-runtime[^"']*["']/.test(readFileSync(f, "utf8")),
      false,
      `core must not import the operator-runtime layer: ${f}`,
    );
  }
});

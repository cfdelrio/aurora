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

// 043-D2-R scoped one-file token-pin: the approved `pg` client may appear ONLY in this adapter file.
const APPROVED_PG_ADAPTER = "postgres-row-store-client.ts";
const PG_IMPORT = /from\s+["']pg["']/;

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

test("6 operator-runtime imports only allowed public surfaces (app-orchestration index + shared-kernel + within-layer; pg only in the approved adapter)", () => {
  for (const f of productionFiles()) {
    const isApprovedAdapter = f.endsWith(APPROVED_PG_ADAPTER);
    for (const spec of importSpecs(readFileSync(f, "utf8"))) {
      if (!spec.startsWith(".")) {
        // the ONLY approved external import is `pg`, and ONLY in the approved adapter file (043-D2-R token-pin)
        assert.ok(isApprovedAdapter && spec === "pg", `operator-runtime must import no external/node module except pg in the approved adapter: '${spec}' in ${f}`);
        continue;
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
    // the approved Postgres adapter is the ONE file allowed to mention pg/postgres (token-pin); all other
    // DB tokens stay banned everywhere, including in that file.
    if (!f.endsWith(APPROVED_PG_ADAPTER)) {
      assert.equal(dbToken.test(src), false, `operator-runtime must reference no DB/ORM/migration token: ${f}`);
      assert.equal(PG_IMPORT.test(src), false, `only the approved adapter may import pg: ${f}`);
    }
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
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
  // no operator-runtime package script was added in C1
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    assert.equal(/operator-runtime/.test(cmd), false, `no operator-runtime package script may be added in C1: ${cmd}`);
  }
});

test("D2-R token-pin: pg is the only approved DB dependency and its import appears only in the approved adapter", () => {
  // exactly one production file imports pg — the approved adapter — and it does import it
  const pgImporters = productionFiles().filter((f) => PG_IMPORT.test(readFileSync(f, "utf8")));
  assert.deepEqual(pgImporters.map((f) => f.split("/").pop()), [APPROVED_PG_ADAPTER], "pg import must appear only in the approved adapter");

  // the approved adapter imports pg and no OTHER DB/ORM/object-storage/cloud client
  const adapterSrc = readFileSync(join(layerDir, "application", APPROVED_PG_ADAPTER), "utf8");
  assert.ok(PG_IMPORT.test(adapterSrc), "the approved adapter must import pg");
  const otherDbOrSdk = /(["'](postgres|sqlite|mysql|mongodb|mongoose|typeorm|prisma|knex|sequelize|drizzle|redis)["'])|@aws-sdk|aws-sdk|@google-cloud|@azure|minio|testcontainers/i;
  for (const spec of importSpecs(adapterSrc)) {
    assert.equal(otherDbOrSdk.test(`"${spec}"`), false, `approved adapter must import no other DB/ORM/object-storage/cloud client: ${spec}`);
  }

  // package.json: exactly the approved dependency set — pg (runtime) + @types/pg (type-only); nothing else
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "pg is the only approved runtime dependency");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "@types/pg is the only approved type-only DB dependency");
  const forbiddenPkg = /^(postgres|prisma|drizzle|typeorm|sequelize|knex|mongoose|mongodb|mysql|sqlite|@aws-sdk\/.*|aws-sdk|@google-cloud\/.*|@azure\/.*|minio|testcontainers|@testcontainers\/.*)$/i;
  for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
    assert.equal(forbiddenPkg.test(name), false, `forbidden package present: ${name} (no ORM/porsager/migration-tool/object-storage/cloud/testcontainers)`);
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

test("25 the operator run service imports invokeOperatorSession and never the underlying reflection runtime", () => {
  const serviceFiles = productionFiles().filter((f) => /operator-run-service\.ts$/.test(f));
  assert.equal(serviceFiles.length, 1, "expected exactly one operator-run-service production file");
  const runtimeSymbol = "offline" + "ReflectionRuntime";
  const runtimeFile = "offline-reflection" + "-runtime";
  for (const f of serviceFiles) {
    const src = readFileSync(f, "utf8");
    assert.ok(src.includes("invokeOperatorSession"), `service must import/call the seam invokeOperatorSession: ${f}`);
    assert.equal(src.includes(runtimeSymbol), false, `service must not reference ${runtimeSymbol}: ${f}`);
    for (const spec of importSpecs(src)) {
      assert.equal(spec.includes(runtimeFile), false, `service must not import the runtime file: ${spec} in ${f}`);
      // the only cross-module import allowed is the app-orchestration public index
      if (/\/modules\//.test(spec)) {
        assert.ok(/application-orchestration\/index\.ts$/.test(spec), `service may import the core only via the app-orchestration index: ${spec} in ${f}`);
      }
    }
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

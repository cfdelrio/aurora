// operator-runtime tests (Implementation 043-G1): STATIC guards over the container packaging artifacts
// (Dockerfile, .dockerignore, the container smoke runbook). These read files AS TEXT ONLY — no `docker build`
// runs in default validation. They prove the image runs the approved executable, exposes nothing, starts no
// server/scheduler, bakes no secret/default caller module/live-provider/delivery/Garmin behavior, uses only the
// approved env-key allowlist, and that no IaC/package/dependency/tsconfig surface was introduced. AC20 untouched.
//
//   container image ≠ API ≠ SaaS ≠ deployment IaC · deployability ≠ recommendation quality ≠ delivery ≠
//   AthleteDecision ≠ Garmin integration ≠ live-provider quality · caller module mounted ≠ caller module baked ·
//   assemble-only default ≠ session execution · Aurora advises, the athlete decides.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../operator-runtime/tests
const srcDir = join(here, "..", ".."); // .../src
const repoRoot = join(srcDir, ".."); // repo root

const DOCKERFILE_PATH = join(repoRoot, "Dockerfile");
const DOCKERIGNORE_PATH = join(repoRoot, ".dockerignore");
const RUNBOOK_PATH = join(repoRoot, "docs", "runbooks", "operator-runtime-container-smoke.md");

const APPROVED_ENV_KEYS = new Set([
  "AURORA_OPERATOR_DATABASE_URL",
  "AURORA_OPERATOR_ARTIFACT_BUCKET",
  "AURORA_OPERATOR_ARTIFACT_REGION",
  "AURORA_OPERATOR_ARTIFACT_ENDPOINT",
  "AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE",
  "AURORA_OPERATOR_SESSION_FACTORY_MODULE",
]);

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

// --- 1. Dockerfile exists and runs the approved executable -------------------------------------------

test("1 Dockerfile exists at repo root and its CMD/ENTRYPOINT runs the operator runtime executable", () => {
  assert.equal(existsSync(DOCKERFILE_PATH), true, "Dockerfile must exist at repo root");
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  assert.ok(
    /CMD\s*\[.*operator-runtime-executable\.mjs.*\]/.test(src) || /ENTRYPOINT\s*\[.*operator-runtime-executable\.mjs.*\]/.test(src),
    "Dockerfile must run scripts/operator-runtime-executable.mjs (source directly, since no build step exists)",
  );
  // it runs source directly — no build/compile step (this repo has no compiled-output dir; see tsconfig noEmit)
  assert.equal(/\bRUN\s+(npm\s+run\s+build|tsc\b|npx\s+tsc)/.test(src), false, "Dockerfile must add no build/compile step");
});

// --- 2. no exposed ports ------------------------------------------------------------------------------

test("2 Dockerfile exposes no port", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  assert.equal(/^\s*EXPOSE\b/im.test(src), false, "Dockerfile must not EXPOSE a port");
});

// --- 3. no API/UI/server start ------------------------------------------------------------------------

test("3 Dockerfile starts no API/UI/server", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  for (const token of ["express", "fastify", "koa", "next start", "npm start", "http.createServer", "listen("]) {
    assert.equal(src.toLowerCase().includes(token.toLowerCase()), false, `Dockerfile must not start an API/UI/server ('${token}')`);
  }
});

// --- 4. no scheduler/cron/supervisor --------------------------------------------------------------

test("4 Dockerfile runs no scheduler/cron/supervisor/worker loop", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  for (const token of ["cron", "supervisord", "pm2", "node-schedule", "setInterval", "while true", "supercronic"]) {
    assert.equal(src.toLowerCase().includes(token.toLowerCase()), false, `Dockerfile must not run a scheduler/cron/supervisor ('${token}')`);
  }
});

// --- 5. no baked secrets -------------------------------------------------------------------------------

test("5 Dockerfile bakes no secret / credential value", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  for (const token of [
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "OPENAI_API_KEY",
    "GARMIN_USERNAME", "GARMIN_PASSWORD", "GARMIN_CONSUMER_KEY", "GARMIN_CONSUMER_SECRET",
  ]) {
    assert.equal(src.includes(token), false, `Dockerfile must not reference the credential key '${token}'`);
  }
  // no hardcoded-looking secret assignment (ENV/ARG KEY=value where value is a non-empty literal)
  const secretish = /\b(SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY)\w*\s*=\s*\S+/i;
  assert.equal(secretish.test(src), false, "Dockerfile must not bake a secret-shaped ENV/ARG assignment");
});

// --- 6. no baked default caller module -------------------------------------------------------------

test("6 Dockerfile bakes no default caller module (no fixtures/ copied, no hardcoded factory module path)", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  assert.equal(/COPY\s+fixtures/i.test(src), false, "Dockerfile must not COPY fixtures/ into the image");
  assert.equal(/AURORA_OPERATOR_SESSION_FACTORY_MODULE\s*=/.test(src), false, "Dockerfile must not set a default AURORA_OPERATOR_SESSION_FACTORY_MODULE value");
});

// --- 7. no live-provider / delivery / Garmin mentions ------------------------------------------------

test("7 Dockerfile contains no live-provider / delivery / Garmin mentions", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8").toLowerCase();
  for (const token of ["live-provider", "garmin", "deliver"]) {
    assert.equal(src.includes(token), false, `Dockerfile must not mention '${token}'`);
  }
});

// --- 8. only approved env-key names appear ------------------------------------------------------------

test("8 Dockerfile mentions only the approved AURORA_OPERATOR_* env-key names, if any", () => {
  const src = readFileSync(DOCKERFILE_PATH, "utf8");
  const found = [...src.matchAll(/\bAURORA_OPERATOR_[A-Z_]+\b/g)].map((m) => m[0]);
  for (const key of found) {
    assert.ok(APPROVED_ENV_KEYS.has(key), `Dockerfile references an unapproved env key: ${key}`);
  }
});

// --- 9. .dockerignore exists and excludes at least .env + node_modules -------------------------------

test("9 .dockerignore exists and excludes .env* / node_modules / .git / coverage / .DS_Store", () => {
  assert.equal(existsSync(DOCKERIGNORE_PATH), true, ".dockerignore must exist at repo root");
  const lines = readFileSync(DOCKERIGNORE_PATH, "utf8").split("\n").map((l) => l.trim());
  for (const required of [".git", "node_modules", ".env", "coverage", ".DS_Store"]) {
    assert.ok(lines.some((l) => l === required || l.startsWith(required)), `.dockerignore must exclude '${required}'`);
  }
  assert.ok(lines.includes(".env.*") || lines.some((l) => l.startsWith(".env.")), ".dockerignore must exclude .env.* files");
});

// --- 10. runbook exists and states the correct scope --------------------------------------------------

test("10 the container smoke runbook exists and states deployability != recommendation quality, and no delivery/AthleteDecision/Garmin claim", () => {
  assert.equal(existsSync(RUNBOOK_PATH), true, "the container smoke runbook must exist");
  const src = readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(/deployab\w*/i.test(src) && /recommendation quality/i.test(src), "runbook must state deployability vs recommendation quality");
  for (const token of ["AthleteDecision", "Garmin", "delivery"]) {
    assert.ok(src.includes(token), `runbook must explicitly address '${token}' (as an explicit non-claim)`);
  }
  // every approved env key is documented
  for (const key of APPROVED_ENV_KEYS) {
    assert.ok(src.includes(key), `runbook must document the env key ${key}`);
  }
});

// --- 11. no IaC files added anywhere in the repo -------------------------------------------------------

test("11 no Terraform/CDK/Pulumi/Kubernetes/other IaC file exists anywhere in the repo", () => {
  const iacPattern = /\.(tf|tfvars)$|(^|\/)(cdk\.json|Pulumi\.ya?ml|serverless\.ya?ml|docker-compose.*\.ya?ml|k8s|kustomization\.ya?ml)$/i;
  for (const f of collectFiles(repoRoot)) {
    const rel = f.slice(repoRoot.length + 1);
    assert.equal(iacPattern.test(rel), false, `no IaC file may exist: ${rel}`);
  }
});

// --- 12. no package script was added ------------------------------------------------------------------

test("12 no package script was added for the container (package.json scripts unchanged)", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  assert.deepEqual(Object.keys(pkg.scripts ?? {}).sort(), ["check", "test", "typecheck"], "package.json scripts must remain exactly check/test/typecheck");
});

// --- 13/14. no package/lockfile change, no new dependency ---------------------------------------------

test("13/14 package.json / package-lock.json dependencies unchanged; no new dependency was added for 043-G1", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"], "dependencies must remain exactly the D2-R/D3 approved set");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain unchanged");
});

test("14b tsconfig.json unchanged (no build/compile machinery introduced)", () => {
  const tsconfig = JSON.parse(readFileSync(join(repoRoot, "tsconfig.json"), "utf8")) as { include?: unknown; compilerOptions?: { noEmit?: boolean } };
  assert.deepEqual(tsconfig.include, ["src"]);
  assert.equal(tsconfig.compilerOptions?.noEmit, true, "tsconfig must remain noEmit: true (no compiled-output directory introduced)");
});

// --- 15. no API/UI/server files were added --------------------------------------------------------

test("15 no API/UI/server file was added anywhere under src/ or scripts/", () => {
  for (const dir of [srcDir, join(repoRoot, "scripts")]) {
    for (const f of collectFiles(dir)) {
      assert.equal(/\/(api|ui|frontend|server)\//i.test(f), false, `must contain no api/ui/server file: ${f}`);
    }
  }
});

// --- 16. AC20 unchanged --------------------------------------------------------------------------------

test("16 AC20 unchanged: src/modules top-level allowlist untouched by container packaging", () => {
  const modulesDir = join(srcDir, "modules");
  const ALLOWED_MODULES = new Set([
    "observation", "reasoning", "understanding", "decision-support", "athlete",
    "event-recording", "rendering", "delivery", "application-orchestration",
  ]);
  const dirs = readdirSync(modulesDir).filter((e) => statSync(join(modulesDir, e)).isDirectory());
  for (const d of dirs) {
    assert.ok(ALLOWED_MODULES.has(d) || d === "__tests__", `unexpected top-level module '${d}' — AC20 must stay unchanged`);
  }
});

// --- the fixture is still not baked / still excluded -----------------------------------------------

test("17 the reference caller fixture stays excluded from the Docker build context", () => {
  const dockerignore = readFileSync(DOCKERIGNORE_PATH, "utf8");
  const dockerfile = readFileSync(DOCKERFILE_PATH, "utf8");
  assert.equal(/COPY\s+fixtures/i.test(dockerfile), false, "Dockerfile must not COPY the fixtures/ directory");
  assert.ok(dockerignore.split("\n").map((l) => l.trim()).includes("fixtures"), ".dockerignore excludes fixtures/ from the build context");
});

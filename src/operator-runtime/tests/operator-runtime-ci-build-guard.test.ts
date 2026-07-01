// operator-runtime tests (Implementation 043-H1): STATIC guards over the ONE approved CI workflow
// (.github/workflows/operator-runtime-docker-build.yml, Spec 043H Option C). These read the workflow file AS
// TEXT ONLY — no GitHub Actions execution and no Docker daemon are required by default validation. They prove
// the workflow only builds the existing Dockerfile (no push, no login, no registry target, no cloud auth, no
// elevated permissions, no secrets, no Aurora env values, no `docker run`, no session, no deploy, no IaC tool
// invocation, no API/UI/server/scheduler semantics) and that it is the ONLY workflow under .github/.
//
// package.json / package-lock.json / dependency / AC20 invariants are already covered by
// operator-runtime-container-packaging.test.ts (tests 12/13/14/16) and operator-runtime-negative-capability.test.ts
// (test 20) — not duplicated here. The Dockerfile itself is unmodified by 043-H1 (no edit was made; its own
// invariants stay covered by operator-runtime-container-packaging.test.ts tests 1/1b/2-9).
//
//   CI image build ≠ production deployment · Docker build success ≠ runtime correctness ·
//   Docker build success ≠ recommendation quality · workflow ≠ release publication · workflow ≠ cloud rollout ·
//   workflow ≠ session execution · workflow ≠ delivery · workflow ≠ AthleteDecision ·
//   Aurora advises, the athlete decides · Aurora never presents inference as fact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // .../operator-runtime/tests
const srcDir = join(here, "..", ".."); // .../src
const repoRoot = join(srcDir, ".."); // repo root

const WORKFLOWS_DIR = join(repoRoot, ".github", "workflows");
const APPROVED_WORKFLOW_FILE = "operator-runtime-docker-build.yml";
const WORKFLOW_PATH = join(WORKFLOWS_DIR, APPROVED_WORKFLOW_FILE);

function workflowSrc(): string {
  return readFileSync(WORKFLOW_PATH, "utf8");
}

// --- 1/2. exactly one workflow, at the approved path -------------------------------------------------

test("1/2 exactly one GitHub Actions workflow exists, at the approved build-only path", () => {
  assert.equal(existsSync(WORKFLOWS_DIR), true, ".github/workflows must exist");
  assert.deepEqual(readdirSync(WORKFLOWS_DIR).sort(), [APPROVED_WORKFLOW_FILE], "exactly one approved workflow file may exist");
  assert.equal(existsSync(WORKFLOW_PATH), true, "the approved workflow must exist at the approved path");
});

// --- 3/4. builds the repo Dockerfile ------------------------------------------------------------------

test("3/4 workflow runs docker build against the repository's Dockerfile", () => {
  const src = workflowSrc();
  assert.ok(/docker\s+build\b/.test(src), "workflow must run docker build");
  assert.ok(/docker\s+build\b.*Dockerfile/.test(src.replace(/\n/g, " ")) || /--file\s+Dockerfile/.test(src), "workflow must build the repo's Dockerfile");
});

// --- 5/6. no push / no login --------------------------------------------------------------------------

test("5/6 workflow does not push or log in to any registry", () => {
  const src = workflowSrc().toLowerCase();
  assert.equal(/docker\s+push/.test(src), false, "workflow must not docker push");
  assert.equal(/docker\s+login/.test(src), false, "workflow must not docker login");
  assert.equal(/docker\/login-action|docker\/build-push-action/.test(src), false, "workflow must not use a login/push action");
});

// --- 7. no registry targets ----------------------------------------------------------------------------

test("7 workflow contains no registry target (ghcr/ecr/acr/gcr) and no bare 'registry' mention", () => {
  const src = workflowSrc().toLowerCase();
  for (const token of ["ghcr.io", "ghcr", "ecr", "acr", "gcr", "registry", "docker.io", "hub.docker.com"]) {
    assert.equal(src.includes(token), false, `workflow must not mention a registry target ('${token}')`);
  }
});

// --- 8. no cloud auth actions --------------------------------------------------------------------------

test("8 workflow contains no cloud authentication action", () => {
  const src = workflowSrc().toLowerCase();
  for (const token of ["aws-actions", "azure/login", "google-github-actions", "gcloud", "oidc"]) {
    assert.equal(src.includes(token), false, `workflow must not use a cloud auth action ('${token}')`);
  }
});

// --- 9/10/11. no elevated permissions -------------------------------------------------------------------

test("9/10/11 workflow grants no elevated permission (id-token/packages/deployments write)", () => {
  const src = workflowSrc();
  for (const token of ["id-token: write", "packages: write", "deployments: write"]) {
    assert.equal(src.includes(token), false, `workflow must not grant '${token}'`);
  }
});

// --- 12. no secrets references -------------------------------------------------------------------------

test("12 workflow references no secrets", () => {
  const src = workflowSrc();
  assert.equal(/secrets\s*\./.test(src), false, "workflow must not reference secrets.*");
  assert.equal(/\$\{\{\s*secrets/.test(src), false, "workflow must not interpolate a secrets context");
});

// --- 13/14. no Aurora env values set ---------------------------------------------------------------------

test("13/14 workflow does not set the Aurora DB/S3/caller-module env keys", () => {
  const src = workflowSrc();
  for (const key of [
    "AURORA_OPERATOR_DATABASE_URL",
    "AURORA_OPERATOR_ARTIFACT_BUCKET",
    "AURORA_OPERATOR_ARTIFACT_REGION",
    "AURORA_OPERATOR_ARTIFACT_ENDPOINT",
    "AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE",
    "AURORA_OPERATOR_SESSION_FACTORY_MODULE",
  ]) {
    assert.equal(src.includes(key), false, `workflow must not set/reference '${key}'`);
  }
});

// --- 15/16. no docker run / no session ---------------------------------------------------------------

test("15/16 workflow does not run the built image or run a session", () => {
  const src = workflowSrc();
  assert.equal(/docker\s+run/.test(src), false, "workflow must not docker run");
  for (const token of ["runOperatorSession", "invokeOperatorSession", "operator-runtime-executable"]) {
    assert.equal(src.includes(token), false, `workflow must not reference '${token}' (no session run)`);
  }
});

// --- 17/18. no deploy / no IaC tool invocation ----------------------------------------------------------

test("17/18 workflow does not deploy and invokes no IaC tool", () => {
  const src = workflowSrc().toLowerCase();
  for (const token of ["kubectl", "terraform", "cdk deploy", "cdk synth", "pulumi", "serverless deploy", "sam deploy", "deploy"]) {
    assert.equal(src.includes(token), false, `workflow must not deploy / invoke an IaC tool ('${token}')`);
  }
});

// --- 19. no API/UI/server/scheduler semantics -------------------------------------------------------------

test("19 workflow creates no API/UI/server/scheduler semantics", () => {
  const src = workflowSrc().toLowerCase();
  for (const token of ["express", "fastify", "http.createserver", "app.listen", "cron", "supervisord", "schedule:"]) {
    assert.equal(src.includes(token), false, `workflow must not create API/UI/server/scheduler semantics ('${token}')`);
  }
});

// --- 20. minimal permissions --------------------------------------------------------------------------

test("20 workflow declares top-level permissions: contents: read and nothing broader", () => {
  const src = workflowSrc();
  assert.ok(/^permissions:\s*\n\s*contents:\s*read\s*$/m.test(src) || /permissions:\s*\{\s*contents:\s*read\s*\}/.test(src), "workflow must declare permissions: contents: read");
  // the permissions block ends at the next top-level (non-indented) key
  const permissionsBlockMatch = src.match(/^permissions:\s*\n((?:[ \t]+\S.*\n?)*)/m);
  if (permissionsBlockMatch) {
    const block = permissionsBlockMatch[1]!;
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    assert.deepEqual(lines, ["contents: read"], "permissions block must contain only contents: read");
  }
});

// --- workflow triggers only pull_request / push, no deployment-style trigger -----------------------------

test("the workflow triggers only on pull_request/push (no workflow_dispatch-to-deploy, no release, no schedule)", () => {
  const src = workflowSrc();
  for (const token of ["schedule:", "release:", "deployment:", "deployment_status:"]) {
    assert.equal(src.includes(token), false, `workflow must not trigger on '${token}'`);
  }
});

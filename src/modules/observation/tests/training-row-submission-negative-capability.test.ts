// Implementation 044-A1 — negative-capability + boundary guards for the manual/CSV training-row intake.
// The mapper is a PURE function: no file I/O, no CSV/parsing library, no new dependency, no new
// top-level module, no downstream-module import, and it never bypasses ingestManualInput's
// accepted/partially-accepted/rejected review posture.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // observation/tests
const observationDir = join(here, ".."); // observation
const modulesDir = join(observationDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src
const repoRoot = join(srcDir, ".."); // repo root

const TARGET_FILE = join(observationDir, "application", "training-row-submission.ts");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const DOWNSTREAM = ["reasoning", "understanding", "decision-support", "athlete", "event-recording"];

test("1 the row-submission file exists inside observation/application (no new top-level module)", () => {
  const src = readFileSync(TARGET_FILE, "utf8");
  assert.ok(src.length > 0);
  const modules = readdirSync(join(modulesDir)).filter((e) => statSync(join(modulesDir, e)).isDirectory());
  const ALLOWED = new Set([
    "observation", "reasoning", "understanding", "decision-support", "athlete",
    "event-recording", "rendering", "delivery", "application-orchestration",
  ]);
  for (const m of modules) assert.ok(ALLOWED.has(m) || m === "__tests__", `unexpected top-level module '${m}' — AC20 unchanged`);
});

test("2 the mapper does no file I/O and uses no CSV/parsing library", () => {
  const src = readFileSync(TARGET_FILE, "utf8");
  for (const token of ["node:fs", '"fs"', "'fs'", "readFile", "writeFile", "csv-parse", "papaparse", "fast-csv"]) {
    assert.equal(src.includes(token), false, `mapper must not reference '${token}'`);
  }
});

test("3 the mapper imports only shared-kernel + within-module files (no new dependency, no downstream module)", () => {
  const src = readFileSync(TARGET_FILE, "utf8");
  const specs = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
  for (const spec of specs) {
    assert.ok(
      spec.startsWith(".") || spec.includes("shared-kernel"),
      `training-row-submission.ts must import only shared-kernel/within-module: '${spec}'`,
    );
  }
  for (const mod of DOWNSTREAM) {
    assert.equal(new RegExp(`from\\s+["'][^"']*/${mod}/`).test(src), false, `must not import ${mod}`);
  }
});

test("4 the mapper never calls ingestManualInput itself (stays a pure mapper; the caller ingests)", () => {
  const src = readFileSync(TARGET_FILE, "utf8");
  assert.equal(src.includes("ingestManualInput("), false, "the pure mapper must not call ingestManualInput");
});

test("5 the mapper creates no Evidence/Signal/RenderingRequest and calls no session/delivery seam", () => {
  const src = readFileSync(TARGET_FILE, "utf8");
  for (const token of [
    "EvidenceCase", "createEvidenceCase", "attachSignalAsEvidence", "detectSignals",
    "RenderingRequest", "runOperatorSession", "invokeOperatorSession", "deliver(",
    "AthleteDecision", "offlineReflectionRuntime(",
  ]) {
    assert.equal(src.includes(token), false, `mapper must not reference '${token}'`);
  }
});

test("6 package.json / package-lock.json are unchanged (no new dependency added for 044-A1)", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"]);
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"]);
  assert.deepEqual(Object.keys(pkg.scripts ?? {}).sort(), ["check", "test", "typecheck"]);
});

test("7 AC20 unchanged: no observation production file imports all four core surfaces", () => {
  const productionFiles = collectTsFiles(observationDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/"),
  );
  const CORE = ["reasoning", "understanding", "decision-support"]; // observation itself is the 4th surface
  for (const f of productionFiles) {
    const src = readFileSync(f, "utf8");
    const importsAll = CORE.every((mod) => new RegExp(`from\\s+["'][^"']*/${mod}/`).test(src));
    assert.equal(importsAll, false, `${f} must not import all core surfaces (AC20b)`);
  }
});

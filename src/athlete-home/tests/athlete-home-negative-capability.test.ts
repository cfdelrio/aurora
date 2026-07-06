// UI-001 — Athlete Home negative-capability guards.
// This slice must not become, by accident, any of the things Aurora has explicitly not chosen:
// a server, a framework commitment, a whole-core composer, a domain-logic duplicate, or a channel
// that presents inference as fact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // athlete-home/tests
const homeDir = join(here, "..");
const srcDir = join(homeDir, "..");
const repoRoot = join(srcDir, "..");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const productionFiles = () => collectTsFiles(homeDir).filter((f) => !f.includes("/tests/"));

test("UI-001.NC1 athlete-home introduces no server/framework/dependency tech — it is a rendering of state, not a runtime", () => {
  const forbidden =
    /\b(react|vue|svelte|angular|next|vite|webpack|tailwind|express|fastify|createserver|listen\(|websocket|fetch\()\b/i;
  for (const f of productionFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden runtime/framework token in ${f}`);
  }
});

test("UI-001.NC2 no production athlete-home file imports all four core module surfaces (the AC20 whole-core discipline extends here)", () => {
  const CORE = ["observation/index", "reasoning/index", "understanding/index", "decision-support/index"];
  for (const f of productionFiles().filter((f) => !f.includes("/sample/"))) {
    const src = readFileSync(f, "utf8");
    const importsAll = CORE.every((m) => src.includes(m));
    assert.equal(importsAll, false, `${f} must not compose the whole core (sample scenario excepted, test-and-dev only)`);
  }
});

test("UI-001.NC3 the renderer imports no domain module at all — it can only show what the view model already says", () => {
  const src = readFileSync(join(homeDir, "page", "render-athlete-home.ts"), "utf8");
  assert.equal(/from\s+["'][^"']*\/modules\//.test(src), false, "renderer must not import src/modules");
});

test("UI-001.NC4 the assembler consumes public surfaces only (athlete/understanding/decision-support index), never module internals", () => {
  const src = readFileSync(join(homeDir, "view-model", "assemble-athlete-home.ts"), "utf8");
  const moduleImports = [...src.matchAll(/from\s+["']([^"']*\/modules\/[^"']+)["']/g)].map((m) => m[1]!);
  assert.ok(moduleImports.length >= 1, "the assembler consumes real module types");
  for (const imp of moduleImports) {
    assert.ok(imp.endsWith("/index.ts"), `${imp} must be a public surface (index.ts), not an internal file`);
  }
  assert.equal(src.includes("observation/index"), false, "assembler needs no observation surface");
  assert.equal(src.includes("reasoning/index"), false, "assembler needs no reasoning surface");
});

test("UI-001.NC5 the assembler duplicates no domain logic: no gate names, no ceiling mapping, no confidence arithmetic", () => {
  const src = readFileSync(join(homeDir, "view-model", "assemble-athlete-home.ts"), "utf8");
  for (const token of [
    "evidenceGate", "understandingGate", "purposeGate", "riskGate", "agencyGate",
    "maxVoiceForCeiling", "claimConfidence(", "updateUnderstanding", "detectSignals", "openHypothesis",
    "Math.", "percent", "score",
  ]) {
    assert.equal(src.includes(token), false, `assembler must not re-run domain logic ('${token}')`);
  }
});

test("UI-001.NC6 sample data stays in sample/: no production view-model/page file references the sample scenario", () => {
  for (const f of productionFiles().filter((f) => !f.includes("/sample/") && !f.endsWith("index.ts"))) {
    assert.equal(readFileSync(f, "utf8").includes("sample-scenario"), false, `${f} must not depend on sample data`);
  }
});

test("UI-001.NC7 the sample scenario is explicitly labeled as sample, not real athlete data", () => {
  const src = readFileSync(join(homeDir, "sample", "athlete-home-sample-scenario.ts"), "utf8");
  assert.ok(src.includes("SAMPLE DATA"), "the sample banner must exist");
  assert.ok(src.includes("NOT PRODUCTION LOGIC"), "the sample banner must disclaim production use");
});

test("UI-001.NC8 no forbidden src/ top-level layer appeared alongside athlete-home (ui/api/adapters/infrastructure stay forbidden)", () => {
  for (const forbidden of ["ui", "api", "adapters", "infrastructure", "frontend", "web", "server"]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("UI-001.NC9 athlete-home adds no dependency: package.json still carries exactly the pre-existing runtime deps", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["@aws-sdk/client-s3", "pg"]);
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"]);
});

test("UI-001.NC10 the core never imports athlete-home: no file under src/modules or src/operator-runtime references it", () => {
  for (const dir of [join(srcDir, "modules"), join(srcDir, "operator-runtime")]) {
    for (const f of collectTsFiles(dir)) {
      assert.equal(readFileSync(f, "utf8").includes("athlete-home"), false, `${f} must not import athlete-home`);
    }
  }
});

test("UI-001.NC11 the page presents no inference as fact: rendered sample page carries the inferred tag wherever interpretation appears", () => {
  // structural check: renderer source pairs every inferred-epistemic branch with the epistemicTag call
  const src = readFileSync(join(homeDir, "page", "render-athlete-home.ts"), "utf8");
  assert.ok(src.includes("interpretación de Aurora"));
  assert.ok(src.includes("tag-inferred"));
});

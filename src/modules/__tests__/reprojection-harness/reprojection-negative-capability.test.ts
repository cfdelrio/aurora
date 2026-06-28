// Implementation 012 — negative capability + structural guards. The reprojection harness is a
// neutral, check-only test seam: no production `reprojection` module, no scheduler, no event bus, no
// projection repository, no event sourcing, no DB/API/UI/LLM.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { REPROJECTION_FINDINGS, REPROJECTION_MODES } from "./reprojection.ts";

const here = dirname(fileURLToPath(import.meta.url)); // .../__tests__/reprojection-harness
const testsDir = join(here, ".."); // .../__tests__
const modulesDir = join(testsDir, ".."); // .../modules
const srcDir = join(modulesDir, ".."); // .../src

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

test("no production reprojection / projection / scheduler / event-sourcing module exists", () => {
  for (const forbidden of [
    join("modules", "reprojection"),
    join("modules", "projection"),
    join("modules", "scheduler"),
    join("modules", "event-sourcing"),
    join("modules", "message-broker"),
    join("modules", "queue"),
    "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("the harness lives under __tests__ (neutral seam), not as a production module", () => {
  assert.equal(existsSync(join(modulesDir, "reprojection-harness")), false, "harness must not be a top-level module");
  assert.ok(existsSync(join(testsDir, "reprojection-harness", "index.ts")), "harness lives under __tests__");
});

test("the harness production-side code chooses no scheduler/bus/DB/serialization tech", () => {
  const forbidden =
    /\b(scheduler|cron|setinterval|settimeout|eventbus|event-bus|publish|subscribe|dispatch|broker|queue|sqlite|postgres|mysql|mongodb|prisma|typeorm|knex|drizzle|migration|event-sourcing|eventsourcing)\b/i;
  const harnessFiles = collectTsFiles(join(testsDir, "reprojection-harness")).filter((f) => !f.endsWith(".test.ts"));
  for (const f of harnessFiles) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden token in ${f}`);
  }
});

test("the closed finding/mode catalogs hold exactly the specified values", () => {
  assert.deepEqual(
    [...REPROJECTION_FINDINGS].sort(),
    [
      "changed",
      "event-record-only",
      "invalid",
      "manual-review-required",
      "missing-source",
      "missing-traceability",
      "partial",
      "requires-policy-transition",
      "source-superseded",
      "stale",
      "unchanged",
    ].sort(),
  );
  assert.deepEqual([...REPROJECTION_MODES].sort(), ["check-only", "mark-stale", "refresh-derived"].sort());
});

test("no domain module imports the reprojection harness", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      assert.equal(
        /reprojection-harness/.test(readFileSync(f, "utf8")),
        false,
        `${mod} must not import the reprojection harness: ${f}`,
      );
    }
  }
});

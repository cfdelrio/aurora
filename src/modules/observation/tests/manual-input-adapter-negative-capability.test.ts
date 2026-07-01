// Implementation 013 — negative capability + boundary guards for the Manual Input Adapter.
// The adapter is observation-owned: it imports no downstream module and no event-recording, and it
// introduces no UI/API/LLM/DB/event-bus/scheduler. observation stays event-recording-free.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  MANUAL_INPUT_LIMITATIONS,
  MANUAL_INPUT_QUALITIES,
  MANUAL_INPUT_REJECTION_REASONS,
} from "../index.ts";

const here = dirname(fileURLToPath(import.meta.url)); // observation/tests
const observationDir = join(here, ".."); // observation
const modulesDir = join(observationDir, ".."); // modules
const srcDir = join(modulesDir, ".."); // src

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

function productionFiles(dir: string): string[] {
  return collectTsFiles(dir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("__tests__") && !f.includes("/tests/"),
  );
}

const DOWNSTREAM = ["reasoning", "understanding", "decision-support", "athlete", "event-recording"];

test("the manual-input adapter imports no downstream module and no event-recording", () => {
  const adapterFiles = productionFiles(observationDir).filter((f) => f.includes("manual-input"));
  assert.ok(adapterFiles.length >= 3, "expected the manual-input adapter files to exist");
  for (const f of adapterFiles) {
    for (const mod of DOWNSTREAM) {
      assert.equal(
        new RegExp(`from\\s+["'][^"']*/${mod}/`).test(readFileSync(f, "utf8")),
        false,
        `${f} must not import ${mod}`,
      );
    }
  }
});

test("observation (all production code) does not import event-recording or any downstream module", () => {
  for (const f of productionFiles(observationDir)) {
    const src = readFileSync(f, "utf8");
    for (const mod of DOWNSTREAM) {
      assert.equal(new RegExp(`from\\s+["'][^"']*/${mod}/`).test(src), false, `${f} must not import ${mod}`);
    }
  }
});

test("no manual-input/ingestion module or adapters/api/ui/infrastructure layer exists", () => {
  for (const forbidden of [
    join("modules", "manual-input"),
    join("modules", "ingestion"),
    "adapters",
    "api",
    "ui",
    "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("the manual-input adapter introduces no LLM/DB/event-bus/scheduler tech", () => {
  const forbidden =
    /\b(llm|openai|anthropic|gpt|prompt|sqlite|postgres|mysql|mongodb|prisma|typeorm|knex|drizzle|migration|eventbus|event-bus|scheduler|cron|setinterval|settimeout)\b/i;
  for (const f of productionFiles(observationDir).filter((f) => f.includes("manual-input"))) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden token in ${f}`);
  }
});

test("the closed manual-input catalogs hold exactly the specified values", () => {
  assert.equal(MANUAL_INPUT_REJECTION_REASONS.length, 9);
  // Impl 044-A1 added "missing-unit" + "unparseable-numeric-value" (measured-value is no longer reserved).
  assert.equal(MANUAL_INPUT_LIMITATIONS.length, 9);
  assert.equal(MANUAL_INPUT_QUALITIES.length, 7);
  assert.ok(MANUAL_INPUT_REJECTION_REASONS.includes("no-faithful-observation"));
  assert.ok(MANUAL_INPUT_LIMITATIONS.includes("missing-unit"));
  assert.ok(MANUAL_INPUT_LIMITATIONS.includes("unparseable-numeric-value"));
});

// Dependency-boundary tests over the import graph:
//  - decision-support MAY import reasoning and understanding,
//  - reasoning MUST NOT import decision-support,
//  - understanding MUST NOT import decision-support,
//  - observation MUST NOT import decision-support.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// tests -> decision-support -> modules
const modulesDir = join(here, "..", "..");
const decisionSupportRoot = join(modulesDir, "decision-support");
const reasoningRoot = join(modulesDir, "reasoning");
const understandingRoot = join(modulesDir, "understanding");
const observationRoot = join(modulesDir, "observation");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function importsMatching(root: string, pattern: RegExp): string[] {
  return collectTsFiles(root).filter((f) => pattern.test(readFileSync(f, "utf8")));
}

const downstream = /from\s+["'][^"']*decision-support[^"']*["']/;

test("reasoning must not import decision-support", () => {
  const offenders = importsMatching(reasoningRoot, downstream);
  assert.deepEqual(offenders, [], `reasoning must stay upstream: ${offenders.join(", ")}`);
});

test("understanding must not import decision-support", () => {
  const offenders = importsMatching(understandingRoot, downstream);
  assert.deepEqual(offenders, [], `understanding must stay upstream: ${offenders.join(", ")}`);
});

test("observation must not import decision-support", () => {
  const offenders = importsMatching(observationRoot, downstream);
  assert.deepEqual(offenders, [], `observation must stay upstream: ${offenders.join(", ")}`);
});

test("decision-support may import reasoning (allowed and expected)", () => {
  const importers = importsMatching(decisionSupportRoot, /from\s+["'][^"']*reasoning[^"']*["']/);
  assert.ok(importers.length > 0, "decision-support is expected to consume reasoning outcomes");
});

test("decision-support may import understanding (allowed and expected)", () => {
  const importers = importsMatching(decisionSupportRoot, /from\s+["'][^"']*understanding[^"']*["']/);
  assert.ok(importers.length > 0, "decision-support is expected to consume understanding assessments");
});

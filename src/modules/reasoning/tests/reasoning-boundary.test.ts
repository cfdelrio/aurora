// Dependency-boundary tests over the import graph:
//  - reasoning MAY import observation,
//  - observation MUST NOT import reasoning,
//  - reasoning MUST NOT import understanding or decision-support.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// tests -> reasoning -> modules
const modulesDir = join(here, "..", "..");
const reasoningRoot = join(modulesDir, "reasoning");
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

test("observation must not import reasoning", () => {
  const offenders = importsMatching(observationRoot, /from\s+["'][^"']*reasoning[^"']*["']/);
  assert.deepEqual(offenders, [], `observation must not import reasoning: ${offenders.join(", ")}`);
});

test("reasoning must not import understanding or decision-support", () => {
  const offenders = importsMatching(
    reasoningRoot,
    /from\s+["'][^"']*(understanding|decision-support)[^"']*["']/,
  );
  assert.deepEqual(offenders, [], `reasoning must not import understanding/decision-support: ${offenders.join(", ")}`);
});

test("reasoning may import observation (this is allowed and expected)", () => {
  const importers = importsMatching(reasoningRoot, /from\s+["'][^"']*observation[^"']*["']/);
  assert.ok(importers.length > 0, "reasoning is expected to consume observation Signals");
});

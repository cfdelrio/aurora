// Dependency-boundary tests over the import graph:
//  - understanding MAY import reasoning,
//  - reasoning MUST NOT import understanding,
//  - understanding MUST NOT import decision-support,
//  - observation MUST NOT import reasoning or understanding.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// tests -> understanding -> modules
const modulesDir = join(here, "..", "..");
const understandingRoot = join(modulesDir, "understanding");
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

test("reasoning must not import understanding", () => {
  const offenders = importsMatching(reasoningRoot, /from\s+["'][^"']*understanding[^"']*["']/);
  assert.deepEqual(offenders, [], `reasoning must not import understanding: ${offenders.join(", ")}`);
});

test("understanding must not import decision-support", () => {
  const offenders = importsMatching(
    understandingRoot,
    /from\s+["'][^"']*decision-support[^"']*["']/,
  );
  assert.deepEqual(offenders, [], `understanding must not import decision-support: ${offenders.join(", ")}`);
});

test("observation must not import reasoning or understanding", () => {
  const offenders = importsMatching(
    observationRoot,
    /from\s+["'][^"']*(reasoning|understanding)[^"']*["']/,
  );
  assert.deepEqual(offenders, [], `observation must stay upstream: ${offenders.join(", ")}`);
});

test("understanding may import reasoning (allowed and expected)", () => {
  const importers = importsMatching(understandingRoot, /from\s+["'][^"']*reasoning[^"']*["']/);
  assert.ok(importers.length > 0, "understanding is expected to consume reasoning outcomes (types)");
});

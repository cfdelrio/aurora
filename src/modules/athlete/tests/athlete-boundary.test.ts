// Dependency-boundary tests: athlete is the upstream context of meaning. It imports ONLY
// shared-kernel -- never observation, reasoning, understanding, or decision-support. The given
// must not depend on the inferred (Technical Boundary Map §2).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// tests -> athlete
const athleteRoot = join(here, "..");

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
  return collectTsFiles(root)
    .filter((f) => !f.endsWith(".test.ts")) // tests may reference other modules' names in strings
    .filter((f) => pattern.test(readFileSync(f, "utf8")));
}

test("athlete must not import observation", () => {
  const offenders = importsMatching(athleteRoot, /from\s+["'][^"']*\/observation[^"']*["']/);
  assert.deepEqual(offenders, [], `athlete must not import observation: ${offenders.join(", ")}`);
});

test("athlete must not import reasoning", () => {
  const offenders = importsMatching(athleteRoot, /from\s+["'][^"']*\/reasoning[^"']*["']/);
  assert.deepEqual(offenders, [], `athlete must not import reasoning: ${offenders.join(", ")}`);
});

test("athlete must not import understanding", () => {
  const offenders = importsMatching(athleteRoot, /from\s+["'][^"']*\/understanding[^"']*["']/);
  assert.deepEqual(offenders, [], `athlete must not import understanding: ${offenders.join(", ")}`);
});

test("athlete must not import decision-support", () => {
  const offenders = importsMatching(athleteRoot, /from\s+["'][^"']*\/decision-support[^"']*["']/);
  assert.deepEqual(offenders, [], `athlete must not import decision-support: ${offenders.join(", ")}`);
});

test("athlete production code imports only shared-kernel and its own files", () => {
  const bad: string[] = [];
  for (const f of collectTsFiles(athleteRoot).filter((x) => !x.endsWith(".test.ts"))) {
    const src = readFileSync(f, "utf8");
    const re = /from\s+["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const spec = m[1] ?? "";
      if (!spec.startsWith(".")) {
        continue; // bare/node specifiers (e.g. node:*) are not module coupling
      }
      const resolved = resolve(dirname(f), spec);
      // Allowed: resolves within the athlete module, or into the shared-kernel.
      const isOwn = resolved.startsWith(athleteRoot);
      const isSharedKernel = resolved.includes(`${join("src", "shared-kernel")}`);
      if (!isOwn && !isSharedKernel) {
        bad.push(`${f} -> ${spec}`);
      }
    }
  }
  assert.deepEqual(bad, [], `athlete may import only shared-kernel + own files: ${bad.join(", ")}`);
});

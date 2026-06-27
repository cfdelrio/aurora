// Dependency-boundary test — the observation module must not import reasoning/decision-support etc.
// (Boundary Map §2: observation cannot depend on reasoning.) Enforced by inspecting the import graph.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// tests/signal -> tests -> observation (module root)
const moduleRoot = join(here, "..", "..");

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

const FORBIDDEN_IMPORT =
  /from\s+["'][^"']*(reasoning|decision-support|\/evidence|\/hypothesis|\/impact|\/understanding)[^"']*["']/;

test("no file in the observation module imports a forbidden downstream module", () => {
  const files = collectTsFiles(moduleRoot);
  assert.ok(files.length > 0, "should find module files");
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.equal(
      FORBIDDEN_IMPORT.test(src),
      false,
      `${file} must not import reasoning/decision-support/evidence/hypothesis/impact/understanding`,
    );
  }
});

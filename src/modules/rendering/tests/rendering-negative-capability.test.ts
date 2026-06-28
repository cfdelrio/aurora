// Implementation 014 — negative capability + boundary guards. rendering is downstream presentation: it
// imports only shared-kernel + read-only decision-support TYPES, no domain module imports it, and there
// is no real LLM provider / API / UI / external integration.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { RENDERING_FAILURES, SAFE_STYLES } from "../index.ts";

const here = dirname(fileURLToPath(import.meta.url)); // rendering/tests
const renderingDir = join(here, ".."); // rendering
const modulesDir = join(renderingDir, ".."); // modules
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

const FORBIDDEN_MODULES = ["observation", "reasoning", "understanding", "athlete", "event-recording"];

test("rendering imports no domain module other than read-only decision-support types", () => {
  for (const f of productionFiles(renderingDir)) {
    const src = readFileSync(f, "utf8");
    for (const mod of FORBIDDEN_MODULES) {
      assert.equal(new RegExp(`from\\s+["'][^"']*/${mod}/`).test(src), false, `${f} must not import ${mod}`);
    }
    // any decision-support import must be type-only (read-only)
    for (const line of src.split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()} (${f})`);
      }
    }
  }
});

test("no domain module imports rendering", () => {
  for (const mod of [...FORBIDDEN_MODULES, "decision-support"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      assert.equal(/from\s+["'][^"']*\/rendering\//.test(readFileSync(f, "utf8")), false, `${mod} must not import rendering: ${f}`);
    }
  }
});

test("no LLM provider / API / UI / infrastructure layer exists", () => {
  for (const forbidden of [
    "llm",
    join("modules", "llm"),
    join("modules", "openai"),
    join("modules", "provider"),
    "api",
    "ui",
    "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("rendering production code makes no external provider/network call", () => {
  // Impl 021 — SURGICAL exception: native network tokens are allowed ONLY in the single approved live
  // transport file; vendor / SDK tokens stay forbidden EVERYWHERE, including that file.
  const network = /\bnode:https?\b|fetch\s*\(|https?:\/\//i;
  const vendorSdk = /\b(openai|anthropic|axios)\b/i;
  const APPROVED_NETWORK_FILE = "live-provider-http-transport.ts";
  for (const f of productionFiles(renderingDir)) {
    const src = readFileSync(f, "utf8");
    assert.equal(vendorSdk.test(src), false, `forbidden vendor/SDK token in ${f}`);
    if (!f.endsWith(APPROVED_NETWORK_FILE)) {
      assert.equal(network.test(src), false, `forbidden provider/network token in ${f}`);
    }
  }
  // positive assertion: the approved transport file is the ONLY rendering file containing a network token.
  const withNetwork = productionFiles(renderingDir)
    .filter((f) => network.test(readFileSync(f, "utf8")))
    .map((f) => f.split("/").pop());
  assert.deepEqual(withNetwork, [APPROVED_NETWORK_FILE], "exactly one approved network file is allowed");
});

test("the closed catalogs hold exactly the specified values", () => {
  assert.equal(RENDERING_FAILURES.length, 12);
  assert.equal(SAFE_STYLES.length, 5);
  assert.ok(RENDERING_FAILURES.includes("voice-escalation"));
  assert.ok(RENDERING_FAILURES.includes("invented-fact"));
});

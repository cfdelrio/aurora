// Implementation 018 — negative capability + boundary guards for the provider-attempt audit. The audit
// files live inside `rendering`, import only own module + shared-kernel (+ read-only decision-support
// TYPES), never import event-recording/delivery/upstream, never call the provider/validator, contain no
// SDK/network/prompt token, and create no audit/telemetry/provider top-level module. A ProviderAttemptRecord
// carries no domain field and no raw draft. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FakeProviderAdapter, requestProviderRendering, auditProviderAttempt } from "../index.ts";
import { supportRenderable, req } from "./fixtures.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

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

function auditFiles(): string[] {
  return collectTsFiles(renderingDir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("/tests/") && /provider-attempt/.test(f),
  );
}

test("audit files import no upstream / delivery / event-recording module", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|athlete|event-recording|delivery)\//;
  for (const f of auditFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
  assert.ok(auditFiles().length >= 6, "expected the provider-attempt audit files to exist");
});

test("audit files' decision-support imports are type-only (read-only)", () => {
  for (const f of auditFiles()) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (/from\s+["'][^"']*\/decision-support\//.test(line)) {
        assert.ok(/^\s*import type\b/.test(line), `decision-support import must be type-only: ${line.trim()} (${f})`);
      }
    }
  }
});

test("the audit does not call the provider seam or the validator", () => {
  for (const f of auditFiles()) {
    const src = readFileSync(f, "utf8");
    for (const banned of ["requestProviderRendering(", "validateDraft(", ".draft(", "new FakeProviderAdapter"]) {
      assert.equal(src.includes(banned), false, `audit file ${f} must not call '${banned}'`);
    }
  }
});

test("audit files contain no provider SDK / network / prompt token", () => {
  const forbidden = /\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i;
  for (const f of auditFiles()) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `forbidden provider/network token in ${f}`);
  }
});

test("no provider-audit / telemetry / evaluation / provider / llm top-level module and no api/ui/infra/providers/prompts layer", () => {
  for (const forbidden of [
    join("modules", "provider-audit"),
    join("modules", "provider"),
    join("modules", "llm"),
    join("modules", "telemetry"),
    join("modules", "evaluation"),
    join("modules", "openai"),
    join("modules", "anthropic"),
    join("modules", "model"),
    "api",
    "ui",
    "infrastructure",
    "providers",
    "prompts",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no module outside rendering imports the provider-attempt audit", () => {
  // Impl 024 makes "ProviderAttemptRecord" a legitimate ref-KIND STRING in the event catalog (referenced by
  // name only, never imported). The real boundary still held here: no module outside rendering IMPORTS the
  // provider-attempt audit, and the rendering-internal audit symbols never appear outside rendering.
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording", "delivery"]) {
    for (const f of collectTsFiles(join(modulesDir, mod))) {
      const src = readFileSync(f, "utf8");
      assert.equal(
        /from\s+["'][^"']*\/rendering\/[^"']*provider-attempt/.test(src),
        false,
        `${mod} must not import the provider-attempt audit: ${f}`,
      );
      for (const sym of ["auditProviderAttempt", "InMemoryProviderAttemptRecordRepository"]) {
        assert.equal(src.includes(sym), false, `${mod} must not reference '${sym}': ${f}`);
      }
    }
  }
});

// Superseded by Implementation 024 (approved, additive catalog expansion): the provider-attempt occurrence/
// outcome event types are now a deliberate part of the closed event catalog — referenced by string KIND only.
// The boundary that still holds: event-recording's catalog file imports nothing from rendering.
test("provider-attempt events live in the catalog as approved ref-only, import-neutral types (Impl 024)", () => {
  const catalog = readFileSync(join(modulesDir, "event-recording", "domain", "domain-event-type.ts"), "utf8");
  assert.equal(catalog.includes("ProviderAttemptRecorded"), true, "Impl 024 added the provider-attempt event type");
  assert.equal(catalog.includes("ProviderDraftRejected"), false, "024 uses ProviderDraftValidationFailed/Passed, not ProviderDraftRejected");
  assert.equal(/from\s+["'][^"']*\/rendering\//.test(catalog), false, "event-recording must not import rendering");
});

test("a ProviderAttemptRecord carries no domain field and no raw draft", () => {
  const provider = new FakeProviderAdapter({ scenario: "safe" });
  const outcome = requestProviderRendering({ request: req(supportRenderable()), provider });
  const rec = auditProviderAttempt({
    request: req(supportRenderable()),
    outcome,
    providerAdapterKind: provider.kind,
    requestedAt: timestamp("2026-03-01T10:00:00.000Z"),
    completedAt: timestamp("2026-03-01T10:00:01.000Z"),
    createdAt: timestamp("2026-03-01T10:00:02.000Z"),
  });
  const json = JSON.stringify(rec.toState()).toLowerCase();
  for (const banned of ["evidence", "observationset", "understandingprofile", "athletedecision", "hypothesis", "supportquality", "decisionsupportcase", "displayeligib", "deliveryrecord"]) {
    assert.ok(!json.includes(banned), `record state must not carry '${banned}'`);
  }
});

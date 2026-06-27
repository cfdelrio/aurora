// Implementation 015 — negative capability + boundary guards for rendered-message records/review.
// rendering keeps its own presentation records: no event-recording, no new event catalog entry, no
// provider/UI/API/delivery, and the record carries no domain field.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  RenderedMessageRecord,
  renderedMessageRecordId,
} from "../index.ts";
import type { RenderedMessage } from "../index.ts";
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

function productionFiles(dir: string): string[] {
  return collectTsFiles(dir).filter(
    (f) => !f.endsWith(".test.ts") && !f.includes("__tests__") && !f.includes("/tests/"),
  );
}

test("rendering does not import event-recording (events deferred for this slice)", () => {
  for (const f of productionFiles(renderingDir)) {
    assert.equal(
      /from\s+["'][^"']*\/event-recording\//.test(readFileSync(f, "utf8")),
      false,
      `${f} must not import event-recording`,
    );
  }
});

test("the event catalog was not extended with rendered-message event types", () => {
  const catalog = readFileSync(join(modulesDir, "event-recording", "domain", "domain-event-type.ts"), "utf8");
  assert.equal(catalog.includes("RenderedMessageRecorded"), false);
  assert.equal(catalog.includes("RenderReviewed"), false);
});

// `delivery` became an approved downstream module in Implementation 016 (test-only allowlist update);
// it is no longer a forbidden future layer here.
test("no rendered-message / review / provider / api / ui / infrastructure layer exists", () => {
  for (const forbidden of [
    join("modules", "rendered-message"),
    join("modules", "review"),
    join("modules", "llm"),
    join("modules", "provider"),
    "api",
    "ui",
    "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("a RenderedMessageRecord carries no domain field (not Evidence/Observation/Understanding/AthleteDecision/DecisionSupport)", () => {
  const m: RenderedMessage = {
    text: "Reflecting; this may be incomplete.",
    sourceRef: "case:1",
    kind: "support",
    voice: "Reflection",
    uncertaintyPreserved: true,
    limitationsPreserved: true,
    traceabilityPreserved: true,
    warnings: [],
  };
  const record = RenderedMessageRecord.fromRenderedMessage({
    id: renderedMessageRecordId("rec-1"),
    message: m,
    rendererKind: "fake",
    createdAt: timestamp("2026-03-01T10:00:00.000Z"),
  });
  const json = JSON.stringify(record.toState()).toLowerCase();
  for (const banned of ["evidence", "observationset", "understandingprofile", "athletedecision", "hypothesis", "supportquality", "claimconfidence"]) {
    assert.ok(!json.includes(banned), `record state must not carry '${banned}'`);
  }
});

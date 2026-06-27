// Implementation 016 — negative capability + boundary guards for the delivery module. Delivery is downstream
// exposure: it imports only shared-kernel + read-only rendering; it never imports event-recording or any
// upstream domain module; no module imports delivery; no event catalog expansion; no real provider/channel/
// UI/API/scheduler/event-bus; and a DeliveryRecord carries no domain field. Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  DeliveryRecord,
  deliveryRecordId,
  deliveryRequest,
  newDeliveryRequestId,
} from "../index.ts";
import type { DeliveryEligibilityCheck, DeliveryRecordState } from "../index.ts";
import { renderedMessageRecordId } from "../../rendering/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const here = dirname(fileURLToPath(import.meta.url)); // delivery/tests
const deliveryDir = join(here, ".."); // delivery
const modulesDir = join(deliveryDir, ".."); // modules
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

test("delivery imports only shared-kernel + rendering (no other module)", () => {
  const forbidden = /from\s+["'][^"']*\/(observation|reasoning|understanding|decision-support|athlete|event-recording)\//;
  for (const f of productionFiles(deliveryDir)) {
    assert.equal(forbidden.test(readFileSync(f, "utf8")), false, `${f} must not import a forbidden module`);
  }
});

test("delivery does not import event-recording (events deferred for this slice)", () => {
  for (const f of productionFiles(deliveryDir)) {
    assert.equal(
      /from\s+["'][^"']*\/event-recording\//.test(readFileSync(f, "utf8")),
      false,
      `${f} must not import event-recording`,
    );
  }
});

test("the event catalog was not extended with delivery event types", () => {
  const catalog = readFileSync(join(modulesDir, "event-recording", "domain", "domain-event-type.ts"), "utf8");
  assert.equal(catalog.includes("DeliveryRequested"), false);
  assert.equal(catalog.includes("DeliveryAttempted"), false);
  assert.equal(catalog.includes("DeliveryCompleted"), false);
});

test("rendering does not import delivery (delivery is strictly downstream)", () => {
  for (const f of productionFiles(join(modulesDir, "rendering"))) {
    assert.equal(/from\s+["'][^"']*\/delivery\//.test(readFileSync(f, "utf8")), false, `${f} must not import delivery`);
  }
});

test("no upstream module imports delivery", () => {
  for (const mod of ["observation", "reasoning", "understanding", "decision-support", "athlete", "event-recording"]) {
    for (const f of productionFiles(join(modulesDir, mod))) {
      assert.equal(
        /from\s+["'][^"']*\/delivery\//.test(readFileSync(f, "utf8")),
        false,
        `${f} must not import delivery`,
      );
    }
  }
});

test("no provider / channel / notification / scheduler / event-bus / api / ui / infrastructure layer exists", () => {
  for (const forbidden of [
    join("modules", "provider"),
    join("modules", "channel"),
    join("modules", "notification"),
    join("modules", "scheduler"),
    join("modules", "event-bus"),
    join("modules", "llm"),
    "api",
    "ui",
    "infrastructure",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("a DeliveryRecord carries no domain field (not Evidence/Observation/Understanding/AthleteDecision/DecisionSupport)", () => {
  const ref = "rec-1";
  const eligibility: DeliveryEligibilityCheck = Object.freeze({
    renderedMessageRecordRef: renderedMessageRecordId(ref),
    eligible: true,
    eligibility: Object.freeze({
      eligible: true,
      reasons: Object.freeze([]),
      recordRef: renderedMessageRecordId(ref),
      currentReviewStatus: "approved-for-display" as const,
    }),
    reasons: Object.freeze([]),
    checkedAt: timestamp("2026-03-01T12:00:00.000Z"),
  });
  const state: DeliveryRecordState = {
    id: deliveryRecordId("del-1"),
    renderedMessageRecordRef: renderedMessageRecordId(ref),
    target: "test-sink",
    request: deliveryRequest({
      id: newDeliveryRequestId(),
      renderedMessageRecordRef: renderedMessageRecordId(ref),
      target: "test-sink",
      requestedAt: timestamp("2026-03-01T12:00:00.000Z"),
      requesterKind: "system",
    }),
    eligibility,
    outcome: "delivered",
    sinkKind: "test-sink",
    requestedAt: timestamp("2026-03-01T12:00:00.000Z"),
    attemptedAt: timestamp("2026-03-01T12:00:00.000Z"),
    completedAt: timestamp("2026-03-01T12:00:00.000Z"),
  };
  const json = JSON.stringify(DeliveryRecord.create(state).toState()).toLowerCase();
  for (const banned of ["evidence", "observationset", "understandingprofile", "athletedecision", "hypothesis", "supportquality", "claimconfidence", "decisionsupportcase"]) {
    assert.ok(!json.includes(banned), `record state must not carry '${banned}'`);
  }
});

// Implementation 024 — negative capability for the output-out event surface. The factories are pure and
// ref-only: every event references artifacts by kind+id only (no raw draft/prompt/payload/secret/env value /
// metadata bag), they persist nothing, call no provider/validator/transport/delivery, and event-recording stays
// dependency-neutral (no rendering/delivery/provider import). Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ALLOWED_PAYLOAD_REF_KEYS,
  providerAttemptRecordedEvent,
  providerDraftValidationFailedEvent,
  providerDraftValidationPassedEvent,
  renderedMessageRecordedEvent,
  renderReviewRecordedEvent,
  displayEligibilityDerivedEvent,
  deliveryRequestRecordedEvent,
  deliveryOutcomeRecordedEvent,
} from "../index.ts";
import type { DomainEventRecord } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const here = dirname(fileURLToPath(import.meta.url));
const eventRecordingDir = join(here, "..");
const srcDir = join(eventRecordingDir, "..", "..");
const repoRoot = join(srcDir, "..");
const FACTORY_FILE = join(eventRecordingDir, "application", "provider-rendering-delivery-events.ts");

const T = { occurredAt: timestamp("2026-08-02T10:00:00.000Z"), recordedAt: timestamp("2026-08-02T10:00:05.000Z") } as const;

function allEvents(): readonly DomainEventRecord[] {
  return [
    providerAttemptRecordedEvent({ providerAttemptRecordId: "pa:1", ...T }),
    providerDraftValidationFailedEvent({ providerAttemptRecordId: "pa:1", failureReason: "invented-fact", ...T }),
    providerDraftValidationPassedEvent({ providerAttemptRecordId: "pa:1", renderedMessageRecordId: "rmr:1", ...T }),
    renderedMessageRecordedEvent({ renderedMessageRecordId: "rmr:1", ...T }),
    renderReviewRecordedEvent({ renderReviewId: "rev:1", renderedMessageRecordId: "rmr:1", decision: "rejected-for-display", ...T }),
    displayEligibilityDerivedEvent({ renderedMessageRecordId: "rmr:1", eligible: false, ...T }),
    deliveryRequestRecordedEvent({ deliveryRequestId: "dreq:1", renderedMessageRecordId: "rmr:1", targetSummary: "test-sink", ...T }),
    deliveryOutcomeRecordedEvent({ deliveryRecordId: "drec:1", deliveryRequestId: "dreq:1", outcome: "failed", ...T }),
  ];
}

// every ref (primary + sources + payloadRefs) carries ONLY the allowed ref-only keys.
test("every output-out event is ref-only (no copied state, no metadata bag)", () => {
  for (const rec of allEvents()) {
    const refs = [rec.traceability.primaryArtifactRef, ...rec.traceability.sourceRefs, ...rec.payloadRefs];
    for (const r of refs) {
      for (const key of Object.keys(r)) {
        assert.ok(ALLOWED_PAYLOAD_REF_KEYS.includes(key), `forbidden ref key '${key}' in ${rec.type}`);
      }
    }
  }
});

// serialized event state carries no raw content / secret / env / auth markers.
test("serialized event state leaks no raw content / secret / env / auth markers", () => {
  for (const rec of allEvents()) {
    const json = JSON.stringify(rec.toState()).toLowerCase();
    for (const banned of ["bearer", "authorization", "sk-", "process.env", "apikey", "api_key", "secret", "password", "chain-of-thought", "prompt", "draft text", "rawdraft"]) {
      assert.ok(!json.includes(banned), `${rec.type} state must not contain '${banned}'`);
    }
  }
});

// the factory file performs no side-effecting collaborator call (no persistence / provider / validator / delivery).
test("the event factory file calls no provider/validator/transport/delivery and persists nothing", () => {
  const src = readFileSync(FACTORY_FILE, "utf8");
  // Symbol names are assembled from fragments so THIS test file does not itself contain the contiguous
  // cross-module guard tokens — the rendering boundary guards scan EVERY event-recording file (tests included).
  const seam = "request" + "ProviderRendering";
  const realSeam = "request" + "RealProviderRendering";
  const liveClient = "LiveProvider" + "Client";
  const deliverySink = "Delivery" + "Sink";
  const forbidden = new RegExp(
    [
      "validateDraft\\s*\\(",
      `${realSeam}\\b`,
      `${seam}\\b`,
      `${liveClient}\\b`,
      `${deliverySink}\\b`,
      "\\.save\\s*\\(",
      "\\.append\\s*\\(",
      "fetch\\s*\\(",
    ].join("|"),
  );
  assert.equal(forbidden.test(src), false, "event factories must not call provider/validator/transport/delivery or persist");
});

// event-recording stays dependency-neutral: the factory imports only its own module + shared-kernel.
test("the event factory imports no rendering/delivery/provider/credential module", () => {
  const src = readFileSync(FACTORY_FILE, "utf8");
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1] ?? "";
    const reachesForbidden = /(^|\/)(rendering|delivery|observation|reasoning|understanding|athlete|decision-support)\//.test(spec);
    assert.equal(reachesForbidden, false, `event factory must not import: ${spec}`);
  }
});

test("no event-bus / queue / scheduler / telemetry / evaluation module was created", () => {
  for (const forbidden of [
    join("modules", "event-bus"), join("modules", "events-bus"), join("modules", "queue"),
    join("modules", "scheduler"), join("modules", "telemetry"), join("modules", "evaluation"),
    join("modules", "provider"), join("modules", "llm"), "api", "infrastructure", "db", "database", "migrations",
  ]) {
    assert.equal(existsSync(join(srcDir, forbidden)), false, `must not create src/${forbidden}`);
  }
});

test("no SDK / dependency change", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ["pg"], "the only approved runtime dependency is pg (043-D2-R)");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}).sort(), ["@types/node", "@types/pg", "typescript"], "devDependencies must remain only typescript + @types/node");
});

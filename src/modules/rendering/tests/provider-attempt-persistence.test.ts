// Implementation 018 — ProviderAttemptRecord persistence: repository round-trip, finders, mutation
// isolation, and validated reconstitution (invalid state rejected, raw-content/rawDraftRetained rejected).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryProviderAttemptRecordRepository,
  ProviderAttemptRecord,
  providerAttemptRecordId,
} from "../index.ts";
import type { ProviderAttemptRecordState } from "../index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const REQUESTED = timestamp("2026-03-01T10:00:00.000Z");
const COMPLETED = timestamp("2026-03-01T10:00:01.000Z");
const CREATED = timestamp("2026-03-01T10:00:02.000Z");

function passedState(id = "att-1", ref = "case:1", adapter = "fake"): ProviderAttemptRecordState {
  return {
    id: providerAttemptRecordId(id),
    renderableOutputRef: ref,
    terminalOutputKind: "support",
    voice: "Reflection",
    requestSummary: { style: "clearer", locale: "en" },
    providerAdapterKind: adapter,
    status: "validation-passed",
    draftSummary: { draftProduced: true, rawDraftRetained: false, providerWarningCount: 0 },
    producedRenderedMessage: true,
    requestedAt: REQUESTED,
    completedAt: COMPLETED,
    createdAt: CREATED,
  };
}

test("repository persists and rehydrates a provider attempt record", () => {
  const repo = new InMemoryProviderAttemptRecordRepository();
  repo.save(ProviderAttemptRecord.create(passedState("att-1")));
  assert.ok(repo.exists(providerAttemptRecordId("att-1")));
  const loaded = repo.findById(providerAttemptRecordId("att-1"));
  assert.ok(loaded !== undefined);
  assert.equal(loaded.status, "validation-passed");
  assert.equal(loaded.renderableOutputRef, "case:1");
});

test("finders return matching records by renderable ref and provider adapter kind", () => {
  const repo = new InMemoryProviderAttemptRecordRepository();
  repo.save(ProviderAttemptRecord.create(passedState("att-1", "case:1", "fake")));
  repo.save(ProviderAttemptRecord.create(passedState("att-2", "case:1", "fake")));
  repo.save(ProviderAttemptRecord.create(passedState("att-3", "case:2", "other")));
  assert.equal(repo.findByRenderableOutputRef("case:1").length, 2);
  assert.equal(repo.findByProviderAdapterKind("other").length, 1);
});

test("repository mutation isolation: two finds are independent and the store is unaffected", () => {
  const repo = new InMemoryProviderAttemptRecordRepository();
  repo.save(ProviderAttemptRecord.create(passedState("att-1")));
  const a = repo.findById(providerAttemptRecordId("att-1"));
  const b = repo.findById(providerAttemptRecordId("att-1"));
  assert.ok(a !== undefined && b !== undefined);
  assert.notEqual(a, b);
  try {
    (a.renderingFailureReasons as string[] | undefined)?.push("tampered");
  } catch {
    /* frozen — expected */
  }
  const c = repo.findById(providerAttemptRecordId("att-1"));
  assert.equal(c?.status, "validation-passed");
});

test("reconstitute round-trips and rejects invalid state", () => {
  const rec = ProviderAttemptRecord.create(passedState("att-1"));
  assert.equal(ProviderAttemptRecord.reconstitute(structuredClone(rec.toState())).status, "validation-passed");

  // rawDraftRetained must be literal false
  assert.throws(() =>
    ProviderAttemptRecord.reconstitute({
      ...passedState("att-x"),
      draftSummary: { draftProduced: true, rawDraftRetained: true as unknown as false },
    }),
  );
  // a smuggled raw-content field is rejected
  assert.throws(() =>
    ProviderAttemptRecord.reconstitute({
      ...passedState("att-y"),
      draftSummary: { draftProduced: true, rawDraftRetained: false, draft: "you should rest" } as unknown as ProviderAttemptRecordState["draftSummary"],
    }),
  );
  // validation-passed must have producedRenderedMessage === true
  assert.throws(() =>
    ProviderAttemptRecord.reconstitute({ ...passedState("att-z"), producedRenderedMessage: false }),
  );
  // provider-failed must not claim a produced message
  assert.throws(() => {
    const s = passedState("att-w");
    ProviderAttemptRecord.reconstitute({
      ...s,
      status: "provider-failed",
      providerFailureReason: "provider-unavailable",
      draftSummary: { draftProduced: false, rawDraftRetained: false },
      producedRenderedMessage: true,
    });
  });
  // unknown status rejected
  assert.throws(() =>
    ProviderAttemptRecord.reconstitute({ ...passedState("att-v"), status: "exploded" as unknown as "validation-passed" }),
  );
  // an unknown top-level key (payload bag) is rejected
  assert.throws(() =>
    ProviderAttemptRecord.reconstitute({ ...passedState("att-u"), delivered: true } as unknown as ProviderAttemptRecordState),
  );
});

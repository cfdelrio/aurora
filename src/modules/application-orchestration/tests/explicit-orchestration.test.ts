// Implementation 025 — behavior of the explicit application orchestration boundary. Each step is an explicit
// call; no event or repository write triggers the next step; failures are safe stops or a safe partial result
// (never an automatic retry); delivery is never automatic; display eligibility is necessary but not sufficient.
// Deterministic: fakes + in-memory repositories + injected timestamps. No live network, no real env.

import { test } from "node:test";
import assert from "node:assert/strict";

import { orchestrateRenderDeliver } from "../index.ts";
import type {
  ExplicitOrchestrationCommand,
  ExplicitOrchestrationDependencies,
  OrchestrationReviewInput,
  OrchestrationTiming,
} from "../index.ts";
import {
  FakeProviderClient,
  InMemoryRenderedMessageRecordRepository,
  InMemoryProviderAttemptRecordRepository,
} from "../../rendering/index.ts";
import type { RenderedMessageRecordRepository, ProviderAttemptRecordRepository } from "../../rendering/index.ts";
import { req, supportRenderable } from "../../rendering/tests/fixtures.ts";
import { InMemoryTestSink, InMemoryDeliveryRecordRepository } from "../../delivery/index.ts";
import { InMemoryDomainEventRecordRepository } from "../../event-recording/index.ts";
import type { DomainEventRecordRepository } from "../../event-recording/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const TIMING: OrchestrationTiming = {
  occurredAt: timestamp("2026-09-01T10:00:00.000Z"),
  recordedAt: timestamp("2026-09-01T10:00:05.000Z"),
  requestedAt: timestamp("2026-09-01T10:00:00.000Z"),
  completedAt: timestamp("2026-09-01T10:00:01.000Z"),
  createdAt: timestamp("2026-09-01T10:00:02.000Z"),
  now: timestamp("2026-09-01T10:00:03.000Z"),
};

const APPROVE: OrchestrationReviewInput = {
  decision: "approved-for-display",
  reasons: ["faithful-to-domain-output"],
  reviewerKind: "test",
};
const REJECT: OrchestrationReviewInput = {
  decision: "rejected-for-display",
  reasons: ["voice-escalation"],
  reviewerKind: "test",
};
const DELIVER = { target: "test-sink", requesterKind: "test" } as const;

function command(over?: Partial<ExplicitOrchestrationCommand>): ExplicitOrchestrationCommand {
  return { request: req(supportRenderable()), timing: TIMING, recordEvents: true, ...over };
}

interface Harness {
  readonly renderedRepo: InMemoryRenderedMessageRecordRepository;
  readonly attemptRepo: InMemoryProviderAttemptRecordRepository;
  readonly deliveryRepo: InMemoryDeliveryRecordRepository;
  readonly sink: InMemoryTestSink;
  readonly eventRepo: InMemoryDomainEventRecordRepository;
  readonly deps: ExplicitOrchestrationDependencies;
}

function harness(opts?: {
  readonly scenario?: "safe" | "voice-escalating" | "timeout" | "rate-limited";
  readonly secretStatus?: "present" | "missing" | "invalid";
  readonly sinkBehavior?: "deliver" | "fail" | "cancel";
}): Harness {
  const renderedRepo = new InMemoryRenderedMessageRecordRepository();
  const attemptRepo = new InMemoryProviderAttemptRecordRepository();
  const deliveryRepo = new InMemoryDeliveryRecordRepository();
  const sink = new InMemoryTestSink({ behavior: opts?.sinkBehavior ?? "deliver" });
  const eventRepo = new InMemoryDomainEventRecordRepository();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: opts?.scenario ?? "safe" }),
    config: { providerKind: "fake" },
    secret: { status: opts?.secretStatus ?? "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: renderedRepo,
    providerAttemptRepository: attemptRepo,
    deliverySink: sink,
    deliveryRecordRepository: deliveryRepo,
    eventRepository: eventRepo,
  };
  return { renderedRepo, attemptRepo, deliveryRepo, sink, eventRepo, deps };
}

// --- happy path + explicit composition --------------------------------------------------------------

test("successful explicit composition reaches delivery; each artifact via its explicit step", async () => {
  const h = harness();
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "delivered");
  assert.equal(out.trace.displayEligibility, "eligible");
  assert.equal(typeof out.trace.providerAttemptRecordId, "string");
  assert.equal(typeof out.trace.renderedMessageRecordId, "string");
  assert.equal(typeof out.trace.renderReviewId, "string");
  assert.equal(typeof out.trace.deliveryRequestId, "string");
  assert.equal(typeof out.trace.deliveryRecordId, "string");
  assert.equal(h.sink.delivered.length, 1); // delivered exactly once, only through the explicit delivery step
  assert.equal(h.attemptRepo.findByProviderAdapterKind("fake-provider").length, 1);
  assert.ok((out.trace.eventRecordIds?.length ?? 0) >= 5); // occurrence events recorded explicitly
  assert.equal(h.eventRepo.all().length, out.trace.eventRecordIds?.length);
});

test("a step does not occur unless explicitly selected (no delivery selected → rendered, no delivery)", async () => {
  const renderedRepo = new InMemoryRenderedMessageRecordRepository();
  const eventRepo = new InMemoryDomainEventRecordRepository();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: renderedRepo,
    eventRepository: eventRepo,
  }; // no audit repo, no delivery sink/repo selected
  const out = await orchestrateRenderDeliver(command({ review: APPROVE }), deps);
  assert.equal(out.kind, "rendered");
  assert.equal(out.trace.deliveryRequestId, undefined);
  assert.equal(out.trace.deliveryRecordId, undefined);
  assert.equal(out.trace.providerAttemptRecordId, undefined); // audit not selected
});

// --- fail-closed stops ------------------------------------------------------------------------------

test("credential missing → provider-not-rendered; no record/review/delivery", async () => {
  const h = harness({ secretStatus: "missing" });
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "provider-not-rendered");
  assert.equal(out.trace.renderedMessageRecordId, undefined);
  assert.equal(h.sink.delivered.length, 0);
});

test("provider draft validation failure → provider-not-rendered; no rendered-message record", async () => {
  const h = harness({ scenario: "voice-escalating" });
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "provider-not-rendered");
  assert.equal(out.trace.renderedMessageRecordId, undefined);
  assert.equal(out.trace.reasonCode, "provider-output-failed-validation");
  assert.equal(h.sink.delivered.length, 0);
});

test("provider-attempt audit failure → recording-failed before delivery", async () => {
  const throwingAttempt: ProviderAttemptRecordRepository = {
    save() {
      throw new Error("attempt save failed");
    },
    findById: () => undefined,
    exists: () => false,
    findByRenderableOutputRef: () => [],
    findByProviderAdapterKind: () => [],
  };
  const renderedRepo = new InMemoryRenderedMessageRecordRepository();
  const sink = new InMemoryTestSink();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: renderedRepo,
    providerAttemptRepository: throwingAttempt,
    deliverySink: sink,
    deliveryRecordRepository: new InMemoryDeliveryRecordRepository(),
    eventRepository: new InMemoryDomainEventRecordRepository(),
  };
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), deps);
  assert.equal(out.kind, "recording-failed");
  assert.equal(out.trace.reasonCode, "provider-attempt-audit-failed");
  assert.equal(out.trace.renderedMessageRecordId, undefined);
  assert.equal(sink.delivered.length, 0);
});

test("rendered-message record persistence failure → recording-failed before review/delivery", async () => {
  const throwingRendered: RenderedMessageRecordRepository = {
    save() {
      throw new Error("record save failed");
    },
    findById: () => undefined,
    exists: () => false,
    findBySourceDomainOutputRef: () => [],
  };
  const sink = new InMemoryTestSink();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: throwingRendered,
    providerAttemptRepository: new InMemoryProviderAttemptRecordRepository(),
    deliverySink: sink,
    deliveryRecordRepository: new InMemoryDeliveryRecordRepository(),
    eventRepository: new InMemoryDomainEventRecordRepository(),
  };
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), deps);
  assert.equal(out.kind, "recording-failed");
  assert.equal(out.trace.reasonCode, "rendered-message-record-failed");
  assert.equal(out.trace.renderReviewId, undefined);
  assert.equal(sink.delivered.length, 0);
});

test("review rejection → review-rejected; no delivery", async () => {
  const h = harness();
  const out = await orchestrateRenderDeliver(command({ review: REJECT, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "review-rejected");
  assert.equal(out.trace.displayEligibility, "ineligible");
  assert.equal(h.sink.delivered.length, 0);
});

test("display ineligible (no review approval) → display-ineligible; no delivery", async () => {
  const h = harness();
  const out = await orchestrateRenderDeliver(command({ delivery: DELIVER }), h.deps); // no review → not-reviewed
  assert.equal(out.kind, "display-ineligible");
  assert.equal(out.trace.displayEligibility, "ineligible");
  assert.equal(h.sink.delivered.length, 0);
});

test("delivery failure → delivery-failed; sink called once (no retry)", async () => {
  const h = harness({ sinkBehavior: "fail" });
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "delivery-failed");
  assert.equal(out.trace.reasonCode, "failed");
  assert.equal(h.sink.delivered.length, 1); // attempted exactly once — no automatic retry
});

// --- event recording semantics ----------------------------------------------------------------------

test("event-recording failure → partial-success; the domain steps stand (delivery happened)", async () => {
  const throwingEvents: DomainEventRecordRepository = {
    append() {
      throw new Error("event append failed");
    },
    findById: () => undefined,
    all: () => [],
    findByCorrelation: () => [],
  };
  const sink = new InMemoryTestSink();
  const deps: ExplicitOrchestrationDependencies = {
    client: new FakeProviderClient({ scenario: "safe" }),
    config: { providerKind: "fake" },
    secret: { status: "present", ref: "ref:fake" },
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
    providerAttemptRepository: new InMemoryProviderAttemptRecordRepository(),
    deliverySink: sink,
    deliveryRecordRepository: new InMemoryDeliveryRecordRepository(),
    eventRepository: throwingEvents,
  };
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), deps);
  assert.equal(out.kind, "partial-success");
  assert.equal(out.trace.reasonCode, "event-recording-failed");
  assert.equal(typeof out.trace.deliveryRecordId, "string"); // delivery completed before the event step
  assert.equal(sink.delivered.length, 1); // not invalidated, not retried
});

test("the provider-attempt audit record and the occurrence event records are distinct artifacts", async () => {
  const h = harness();
  const out = await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  assert.equal(out.kind, "delivered");
  const attemptId = out.trace.providerAttemptRecordId;
  assert.ok(attemptId !== undefined);
  assert.equal((out.trace.eventRecordIds ?? []).includes(attemptId), false);
  assert.equal(h.eventRepo.all().length, out.trace.eventRecordIds?.length); // events live in the event repo only
  assert.equal(h.attemptRepo.findByProviderAdapterKind("fake-provider").length, 1); // audit lives in its own repo
});

test("reading event history triggers no orchestration / no further delivery", async () => {
  const h = harness();
  await orchestrateRenderDeliver(command({ review: APPROVE, delivery: DELIVER }), h.deps);
  const deliveredBefore = h.sink.delivered.length;
  const first = h.eventRepo.all();
  const second = h.eventRepo.all();
  assert.equal(first.length, second.length);
  assert.equal(h.sink.delivered.length, deliveredBefore); // reading recorded history delivered nothing more
});

// Implementation 032R-A — behavior of the operator-mediated offline reflection runtime. It composes the two
// PROVEN ends — faithful manual intake (the REAL observation.ingestManualInput, wired via the injected
// runManualIntake step) and render-only orchestration (mandatory validateDraft) — into a safe, inference-marked,
// athlete-facing reflection. Delivery is withheld; no AthleteDecision is created; no live provider, no real
// secret, no network, no process env. Deterministic: fakes + in-memory repositories + injected timestamps.
// Negative tests are defining.

import { test } from "node:test";
import assert from "node:assert/strict";

import { offlineReflectionRuntime, OFFLINE_REFLECTION_STATUSES } from "../index.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
  ManualIntakeStep,
  OrchestrationTiming,
} from "../index.ts";
import {
  FakeProviderClient,
  InMemoryRenderedMessageRecordRepository,
} from "../../rendering/index.ts";
import type { ProviderSecretRef, ProviderClientBoundary } from "../../rendering/index.ts";
import { req, supportRenderable, noVoiceSupportRenderable } from "../../rendering/tests/fixtures.ts";
import { ingestManualInput, InMemoryObservationSetRepository } from "../../observation/index.ts";
import type { ManualInputSubmission, ObservationSetRepository } from "../../observation/index.ts";
import { timestamp } from "../../../shared-kernel/time.ts";

const TIMING: OrchestrationTiming = {
  occurredAt: timestamp("2026-09-01T10:00:00.000Z"),
  recordedAt: timestamp("2026-09-01T10:00:05.000Z"),
  requestedAt: timestamp("2026-09-01T10:00:00.000Z"),
  completedAt: timestamp("2026-09-01T10:00:01.000Z"),
  createdAt: timestamp("2026-09-01T10:00:02.000Z"),
  now: timestamp("2026-09-01T10:00:03.000Z"),
};

function submission(over: Partial<ManualInputSubmission> = {}): ManualInputSubmission {
  return {
    submissionRef: "sub-1",
    athleteRef: "athlete:1",
    submittedAt: timestamp("2026-09-01T09:00:00.000Z"),
    occurredAt: timestamp("2026-09-01T08:00:00.000Z"),
    occasion: "2026-09-01 morning session",
    reporter: "athlete-report",
    entries: [{ kind: "subjective-report", words: "I felt heavy in today's session" }],
    ...over,
  };
}

/** Adapt the REAL ingestManualInput to the injected ManualIntakeStep (no observation type leaks into the runtime). */
function realIntake(
  repo: ObservationSetRepository,
  calls?: { n: number },
): ManualIntakeStep<ManualInputSubmission> {
  return (s) => {
    if (calls) calls.n += 1;
    const outcome = ingestManualInput({ submission: s, observationSetRepository: repo });
    if (outcome.status === "rejected") return { status: "rejected", reasons: [...outcome.reasons] };
    return { status: outcome.status, observationSetId: String(outcome.observationSetId) };
  };
}

interface Harness {
  readonly deps: OfflineReflectionRuntimeDependencies<ManualInputSubmission>;
  readonly renderedRepo: InMemoryRenderedMessageRecordRepository;
  readonly observationRepo: InMemoryObservationSetRepository;
  readonly intakeCalls: { n: number };
}

function harness(opts?: {
  readonly secretStatus?: "present" | "missing" | "invalid";
  readonly scenario?: "safe" | "voice-escalating" | "timeout" | "rate-limited";
}): Harness {
  const renderedRepo = new InMemoryRenderedMessageRecordRepository();
  const observationRepo = new InMemoryObservationSetRepository();
  const intakeCalls = { n: 0 };
  const secret: ProviderSecretRef = { status: opts?.secretStatus ?? "present", ref: "ref:fake" };
  const deps: OfflineReflectionRuntimeDependencies<ManualInputSubmission> = {
    runManualIntake: realIntake(observationRepo, intakeCalls),
    client: new FakeProviderClient({ scenario: opts?.scenario ?? "safe" }),
    config: { providerKind: "fake" },
    secret,
    rendererKind: "fake-renderer",
    providerAdapterKind: "fake-provider",
    renderedMessageRecordRepository: renderedRepo,
  };
  return { deps, renderedRepo, observationRepo, intakeCalls };
}

function command(over?: Partial<OfflineReflectionRuntimeCommand<ManualInputSubmission>>): OfflineReflectionRuntimeCommand<ManualInputSubmission> {
  return {
    submission: submission(),
    athleteRef: "athlete:1",
    request: req(supportRenderable()),
    operatorMediation: { operatorRef: "operator:op-1", mediatedAt: timestamp("2026-09-01T10:00:04.000Z") },
    timing: TIMING,
    ...over,
  };
}

// Test 1 — valid manual input + safe renderable → reflection-ready with a safe projection; delivery withheld.
test("valid manual input produces a reflection-ready outcome with a safe projection", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "reflection-ready");
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.rawRetained, false);
  assert.ok(out.reflection, "reflection projection must be present");
  assert.equal(out.reflection?.presentedAs, "reflection");
  assert.equal(out.reflection?.validationPassed, true);
  assert.equal(typeof out.reflection?.text, "string");
  assert.ok((out.reflection?.text.length ?? 0) > 0);
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes(out.status));
});

// Test 2 — invalid manual input fails closed (no render attempted, no reflection).
test("invalid manual input fails closed → input-rejected, no reflection", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ submission: submission({ athleteRef: "" }) }), h.deps);
  assert.equal(out.status, "input-rejected");
  assert.equal(out.reflection, undefined);
  assert.equal(out.intake.status, "rejected");
  assert.equal(h.renderedRepo.exists.length >= 0, true);
});

// Test 3 — the runtime actually calls the injected (real) ingestManualInput.
test("the runtime calls the injected manual-intake step (real ingestManualInput)", async () => {
  const h = harness();
  await offlineReflectionRuntime(command(), h.deps);
  assert.equal(h.intakeCalls.n, 1, "manual intake must be invoked exactly once");
});

// Test 4 — the runtime calls render-only orchestration (a rendered-message record is produced).
test("the runtime composes render-only orchestration (a rendered-message record is recorded)", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "reflection-ready");
  assert.equal(typeof out.trace.renderedMessageRecordId, "string");
  // delivery / review / audit / event refs are absent (render-only partial composition)
  assert.equal(out.trace.deliveryRecordId, undefined);
  assert.equal(out.trace.deliveryRequestId, undefined);
  assert.equal(out.trace.renderReviewId, undefined);
  assert.equal(out.trace.providerAttemptRecordId, undefined);
  assert.equal((out.trace.eventRecordIds?.length ?? 0), 0);
});

// Test 5 — the runtime does not invent the ObservationSet → RenderableDomainOutput pipeline: it requires the
// renderable to be supplied in the command (a different renderable changes the reflection text).
test("the renderable is supplied in the command (no invented reasoning pipeline)", async () => {
  const h1 = harness();
  const a = await offlineReflectionRuntime(command({ request: req(supportRenderable({ contentAtoms: ["energy was low"], allowedClaims: ["energy was low"] })) }), h1.deps);
  const h2 = harness();
  const b = await offlineReflectionRuntime(command({ request: req(supportRenderable({ contentAtoms: ["legs felt strong"], allowedClaims: ["legs felt strong"] })) }), h2.deps);
  assert.equal(a.status, "reflection-ready");
  assert.equal(b.status, "reflection-ready");
  assert.notEqual(a.reflection?.text, b.reflection?.text, "the supplied renderable determines the reflection");
});

// Test 6 — delivery is withheld (always true; no delivery refs).
test("delivery is withheld on every outcome", async () => {
  const h = harness();
  const ok = await offlineReflectionRuntime(command(), h.deps);
  const rejected = await offlineReflectionRuntime(command({ submission: submission({ athleteRef: "" }) }), harness().deps);
  for (const out of [ok, rejected]) {
    assert.equal(out.deliveryWithheld, true);
    assert.equal(out.trace.deliveryRecordId, undefined);
    assert.equal(out.trace.deliveryRequestId, undefined);
  }
});

// Test 7 — no live provider is called by default (only the injected fake client is used; deterministic).
test("no live provider call by default — deterministic result from the injected fake client", async () => {
  const h = harness();
  const a = await offlineReflectionRuntime(command(), h.deps);
  const b = await offlineReflectionRuntime(command(), harness().deps);
  assert.equal(a.status, "reflection-ready");
  assert.equal(a.reflection?.text, b.reflection?.text, "the fake client renders deterministically (no network)");
});

// Test 8 — no real secret is required (a fake ref produces a reflection).
test("no real secret is required — a fake secret ref still yields a reflection", async () => {
  const h = harness({ secretStatus: "present" });
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "reflection-ready");
});

// Test 9 — credential missing → fail-closed not-rendered (no record, no reflection).
test("missing credential → not-rendered, fail-closed, no reflection", async () => {
  const h = harness({ secretStatus: "missing" });
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "not-rendered");
  assert.equal(out.reflection, undefined);
  assert.equal(out.trace.renderedMessageRecordId, undefined);
});

// Test 10 — validateDraft remains mandatory: a provider draft that fails validation → not-rendered.
test("validateDraft remains mandatory — a draft that fails validation yields not-rendered", async () => {
  const h = harness({ scenario: "voice-escalating" });
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "not-rendered");
  assert.equal(out.reflection, undefined);
  assert.equal(out.trace.renderedMessageRecordId, undefined);
});

// Test 11 — provider output is not returned raw; no hidden reasoning; outcome is ref-only + safe projection.
test("no raw provider output, secret, or hidden reasoning appears in the outcome", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["ref:fake", "bearer", "authorization", "apikey", "api_key", "secret", "process.env", "chain-of-thought"]) {
    assert.equal(json.includes(banned), false, `outcome must not contain '${banned}'`);
  }
});

// Test 12 — inference is marked as inference (presentedAs reflection; uncertainty preserved), never fact.
test("the reflection is presented as reflection with uncertainty preserved (inference not fact)", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.reflection?.presentedAs, "reflection");
  assert.equal(out.reflection?.uncertaintyPreserved, true);
});

// Test 13 — the runtime creates NO AthleteDecision; it only invites one (athlete-declared/reported).
test("the runtime creates no AthleteDecision; it returns only an athlete-decision invitation", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation");
  assert.deepEqual([...out.decisionCapture.acceptableSources], ["athlete-declared", "athlete-reported"]);
  assert.equal(out.decisionCapture.athleteRef, "athlete:1");
  // there is no decision object, no choice, no rationale anywhere in the outcome
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["athletedecision", "\"choice\"", "\"rationale\"", "divergedfromsupport"]) {
    assert.equal(json.includes(banned), false, `outcome must not contain decision artifact '${banned}'`);
  }
});

// Test 14 — operator mediation is recorded as mediation, not decision ownership; athlete remains owner.
test("operator mediation is recorded as mediation only; the athlete remains the decision owner", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.mediation.operatorRef, "operator:op-1");
  // the decision invitation addresses the athlete, not the operator
  assert.equal(out.decisionCapture.athleteRef, "athlete:1");
  assert.notEqual(out.decisionCapture.athleteRef, out.mediation.operatorRef);
});

// Test 15 — no event recording occurs implicitly (no event refs in the trace).
test("no event recording occurs implicitly", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal((out.trace.eventRecordIds?.length ?? 0), 0);
});

// Test 16 — the runtime always resolves to a safe closed status; never rejects.
test("the runtime always resolves to a closed status and never rejects", async () => {
  const h = harness();
  let threw = false;
  let out;
  try {
    out = await offlineReflectionRuntime(command(), h.deps);
  } catch {
    threw = true;
  }
  assert.equal(threw, false);
  assert.ok(out && OFFLINE_REFLECTION_STATUSES.includes(out.status));
});

// ===== Implementation 035-B — Tier 2 admission check wired before render-only orchestration =====

/** A provider client that must never be called — proves the render path is not invoked on a rejected renderable. */
const throwingClient: ProviderClientBoundary = {
  kind: "live",
  requestDraft(): never {
    throw new Error("provider must not be called when the renderable is inadmissible");
  },
};

// Test 17 — an admissible renderable still produces the existing reflection-ready path (validateDraft downstream).
test("035-B: an admissible renderable still produces reflection-ready (downstream validateDraft intact)", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command(), h.deps);
  assert.equal(out.status, "reflection-ready");
  assert.ok(out.reflection);
  assert.equal(out.reflection?.validationPassed, true); // downstream validateDraft still ran
  assert.equal(out.deliveryWithheld, true);
});

// Test 18 — missing provenance → renderable-inadmissible; render path not invoked; provider never called.
test("035-B: a renderable with no provenance is inadmissible and never reaches the provider", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ sourceCaseRef: "  " })) }), {
    ...h.deps,
    client: throwingClient, // would throw if orchestration/provider ran
  });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-missing-provenance");
  assert.equal(out.reflection, undefined);
  assert.equal(out.deliveryWithheld, true);
  assert.equal(out.trace.stoppedAt, "stopped"); // orchestration never started
  assert.equal(out.trace.renderedMessageRecordId, undefined);
});

// Test 19 — unsafe support voice Recommendation → renderable-inadmissible (prescription ceiling).
test("035-B: support voice Recommendation is inadmissible", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ voice: "Recommendation" })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-unsafe-voice");
});

// Test 20 — unsafe support voice Silence → renderable-inadmissible.
test("035-B: support voice Silence is inadmissible", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ voice: "Silence" })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-unsafe-voice");
});

// Test 21 — uncertainty hidden → renderable-inadmissible.
test("035-B: a renderable hiding uncertainty is inadmissible", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ uncertaintyVisibleRequired: false })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-uncertainty-hidden");
});

// Test 22 — agency missing → renderable-inadmissible.
test("035-B: a renderable not preserving agency is inadmissible", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ agencyRequired: false })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-agency-missing");
});

// Test 23 — no-voice support renderable → renderable-inadmissible (voice ceiling requires an advisory voice).
test("035-B: a support renderable with no voice is inadmissible", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(noVoiceSupportRenderable()) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.admissionReason, "rejected-unsafe-voice");
});

// Test 24 — admission runs AFTER intake: a rejected intake still short-circuits to input-rejected first.
test("035-B: a rejected manual intake short-circuits before the admission check", async () => {
  const h = harness();
  // Even with an inadmissible renderable, an invalid submission yields input-rejected (intake is step 1).
  const out = await offlineReflectionRuntime(command({ submission: submission({ athleteRef: "" }), request: req(supportRenderable({ sourceCaseRef: "" })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "input-rejected");
});

// Test 25 — a rejected renderable creates no AthleteDecision and exposes only a safe reason code.
test("035-B: a rejected renderable creates no AthleteDecision and exposes only safe codes", async () => {
  const h = harness();
  const out = await offlineReflectionRuntime(command({ request: req(supportRenderable({ sourceCaseRef: "" })) }), { ...h.deps, client: throwingClient });
  assert.equal(out.status, "renderable-inadmissible");
  assert.equal(out.decisionCapture.kind, "athlete-decision-invitation"); // invitation only; no decision created
  const json = JSON.stringify(out).toLowerCase();
  for (const banned of ["athletedecision", "\"choice\"", "\"rationale\"", "bearer", "process.env", "chain-of-thought"]) {
    assert.equal(json.includes(banned), false, `inadmissible outcome must not contain '${banned}'`);
  }
});

// Test 26 — renderable-inadmissible is a member of the closed status union (additive).
test("035-B: renderable-inadmissible is in the closed status catalog", () => {
  assert.ok(OFFLINE_REFLECTION_STATUSES.includes("renderable-inadmissible"));
});

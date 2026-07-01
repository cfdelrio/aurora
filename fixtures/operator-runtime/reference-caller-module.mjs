// Aurora — REFERENCE operator-session caller module (Implementation 043-F3). Out-of-`src`, plain ESM. It is a
// FIXTURE proving the F1/F2 caller-module contract, NOT production composition owned by Aurora's core.
//
// It demonstrates the approved export convention:
//   export const operatorSessionRequest  — an OperatorSessionRequestEnvelope (a TrainingSessionRecord reference +
//                                           a CALLER-supplied RenderingRequest + injected refs/timestamps)
//   export async function createOperatorSession(bundle) — returns { command, deps } for runOperatorSession
//
// The caller composes command/deps with DETERMINISTIC FAKES (fake manual intake, fake provider, in-memory
// rendered-message repo). It supplies its OWN RenderingRequest via the public rendering fixture — it does NOT
// derive a renderable from Garmin/training data, parse artifacts, import observation/reasoning/understanding/
// decision-support internals, call offlineReflectionRuntime / invokeOperatorSession directly, deliver anything,
// create an AthleteDecision, use a live provider, read the environment, read files, or make network calls.
//
//   reference caller module ≠ production whole-core composer · caller factory ≠ JSON command API ·
//   caller-supplied RenderingRequest ≠ recommendation-quality proof · run proof ≠ delivery ≠ AthleteDecision ·
//   TrainingSessionRecord reference ≠ Evidence · Aurora advises, the athlete decides.

import { FakeProviderClient, InMemoryRenderedMessageRecordRepository } from "../../src/modules/rendering/index.ts";
import { req, supportRenderable } from "../../src/modules/rendering/tests/fixtures.ts";
import { timestamp } from "../../src/shared-kernel/time.ts";

const T = (iso) => timestamp(iso);

// deterministic timing — no Date.now(); the caller injects fixed instants
const TIMING = {
  occurredAt: T("2026-09-04T10:00:00.000Z"),
  recordedAt: T("2026-09-04T10:00:05.000Z"),
  requestedAt: T("2026-09-04T10:00:00.000Z"),
  completedAt: T("2026-09-04T10:00:01.000Z"),
  createdAt: T("2026-09-04T10:00:02.000Z"),
  now: T("2026-09-04T10:00:03.000Z"),
};

// The caller-supplied request envelope: a REFERENCE to a persisted training session + a caller-owned renderable.
export const operatorSessionRequest = {
  trainingSessionId: "training:ref-1",
  athleteRef: "athlete:ref-1",
  operatorRef: "operator:ref-1",
  renderingRequest: req(supportRenderable()),
  runId: "run:ref-1",
  envelopeRecordId: "envelope:ref-1",
  decisionCaptureLinkId: "link:ref-1",
  startedAt: T("2026-09-04T10:00:00.000Z"),
  completedAt: T("2026-09-04T10:00:06.000Z"),
  recordedAt: T("2026-09-04T10:00:07.000Z"),
};

// The caller factory: given the assembled bundle, return the exact command + deps for runOperatorSession.
export async function createOperatorSession(bundle) {
  return {
    command: {
      submission: { athleteRef: bundle.request.athleteRef, note: "reference reflection submission" },
      athleteRef: bundle.request.athleteRef,
      request: bundle.request.renderingRequest, // the caller's own renderable — threaded, never derived here
      operatorMediation: { operatorRef: bundle.request.operatorRef, mediatedAt: T("2026-09-04T10:00:04.000Z") },
      timing: TIMING,
    },
    deps: {
      // a trivial deterministic intake — accepts and returns a ref; imports no observation module
      runManualIntake: () => ({ status: "accepted", observationSetId: "obs:ref-1" }),
      client: new FakeProviderClient({ scenario: "safe" }),
      config: { providerKind: "fake" },
      secret: { status: "present", ref: "ref:fake" },
      rendererKind: "fake-renderer",
      providerAdapterKind: "fake-provider",
      renderedMessageRecordRepository: new InMemoryRenderedMessageRecordRepository(),
    },
  };
}

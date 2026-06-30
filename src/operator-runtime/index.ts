// operator-runtime: public surface of Aurora's out-of-`modules` operator-runtime persistence layer
// (Spec 043B / Tech Spec 043C). It lives at src/operator-runtime/ — a non-module `src` sibling, like
// src/shared-kernel/ — so it is typechecked and tested by the existing config, is invisible to
// AC20a/AC20b (which scan only src/modules/), and is no new core module.
//
// This layer CONSUMES Aurora: it imports only the application-orchestration PUBLIC surface
// (invokeOperatorSession, OperatorSessionEnvelope) + shared-kernel; it runs sessions only behind
// invokeOperatorSession (never the underlying reflection runtime directly) and persists only the safe
// envelope. It must never be imported by the core.
//
// C1: the four operational record types + repository ports + in-memory adapters.
// C2 (this slice): a provenance-safe raw-artifact object-storage PORT + a fake in-memory adapter —
// opaque payloads only, never parsed. Still no real cloud store, no DB, no worker, no executable, no infra.

export {
  trainingSessionRecord,
  trainingSessionRawArtifactRef,
} from "./application/training-session-record.ts";
export type {
  TrainingSessionId,
  TrainingSessionSource,
  TrainingSessionRecord,
  TrainingSessionRecordInput,
  TrainingSessionRawArtifactRef,
  TrainingSessionRawArtifactRefInput,
} from "./application/training-session-record.ts";
export type { TrainingSessionRepository } from "./application/training-session-repository.ts";
export { InMemoryTrainingSessionRepository } from "./application/in-memory-training-session-repository.ts";

export { operatorSessionRunRecord } from "./application/operator-session-run-repository.ts";
export type {
  OperatorSessionRunId,
  OperatorSessionRunRecord,
  OperatorSessionRunRecordInput,
  OperatorSessionRunRepository,
} from "./application/operator-session-run-repository.ts";
export { InMemoryOperatorSessionRunRepository } from "./application/in-memory-operator-session-run-repository.ts";

export { operatorSessionEnvelopeRecord } from "./application/operator-session-envelope-repository.ts";
export type {
  OperatorSessionEnvelopeRecordId,
  OperatorSessionEnvelopeRecord,
  OperatorSessionEnvelopeRecordInput,
  OperatorSessionEnvelopeRepository,
} from "./application/operator-session-envelope-repository.ts";
export { InMemoryOperatorSessionEnvelopeRepository } from "./application/in-memory-operator-session-envelope-repository.ts";

export {
  storedTrainingArtifact,
  toRawArtifactRef,
} from "./application/training-artifact-object-store.ts";
export type {
  TrainingArtifactObjectStore,
  TrainingArtifactMetadata,
  StoredTrainingArtifact,
  PutTrainingArtifactInput,
} from "./application/training-artifact-object-store.ts";
export { FakeTrainingArtifactObjectStore } from "./application/fake-training-artifact-object-store.ts";

export { decisionCaptureLink } from "./application/decision-capture-link-repository.ts";
export type {
  DecisionCaptureLinkId,
  DecisionCaptureLink,
  DecisionCaptureLinkInput,
  DecisionCaptureLinkRepository,
} from "./application/decision-capture-link-repository.ts";
export { InMemoryDecisionCaptureLinkRepository } from "./application/in-memory-decision-capture-link-repository.ts";

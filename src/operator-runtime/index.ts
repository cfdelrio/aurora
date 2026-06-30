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
// C2: a provenance-safe raw-artifact object-storage PORT + a fake in-memory adapter (opaque payloads,
// never parsed).
// C3: an internal operator run SERVICE that coordinates the C1 repositories and runs one session ONLY
// through invokeOperatorSession, persisting only safe records.
// D1 (this slice): zero-dependency concrete-adapter CONTRACTS — vendor-neutral row/blob client ports,
// in-memory fakes, and record/artifact mappers (whitelist-only). Still no real DB/object-storage client,
// no cloud SDK, no filesystem, no migrations, no worker/executable/CLI/API, no infra.

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

export { runOperatorSession } from "./application/operator-run-service.ts";
export type {
  OperatorSessionInvoker,
  OperatorRunServiceDependencies,
  OperatorRunCommand,
  OperatorRunResult,
  OperatorRunResultStatus,
} from "./application/operator-run-service.ts";

// D1 — zero-dependency concrete-adapter CONTRACTS: vendor-neutral row/blob client ports, fakes, and
// record/artifact mappers. No real DB/object-storage client; these are the seams D2/D3 implement.
export { OPERATOR_RUNTIME_TABLES } from "./application/operator-runtime-row-store.ts";
export type {
  StorageScalar,
  StorageRow,
  RowStoreClient,
  OperatorRuntimeTable,
} from "./application/operator-runtime-row-store.ts";
export { FakeRowStoreClient } from "./application/fake-row-store-client.ts";
export type {
  BlobMetadata,
  BlobObject,
  BlobStoreClient,
} from "./application/operator-runtime-blob-store.ts";
export { FakeBlobStoreClient } from "./application/fake-blob-store-client.ts";
export {
  trainingSessionToRow,
  rowToTrainingSession,
  operatorSessionRunToRow,
  rowToOperatorSessionRun,
  operatorSessionEnvelopeToRow,
  rowToOperatorSessionEnvelope,
  decisionCaptureLinkToRow,
  rowToDecisionCaptureLink,
} from "./application/operator-runtime-record-mappers.ts";
export type {
  TrainingSessionRow,
  OperatorSessionRunRow,
  OperatorSessionEnvelopeRow,
  DecisionCaptureLinkRow,
} from "./application/operator-runtime-record-mappers.ts";
export {
  artifactMetadataToBlobMetadata,
  blobMetadataToArtifactMetadata,
  storedArtifactToBlob,
  blobToStoredArtifact,
} from "./application/operator-runtime-artifact-mappers.ts";
export { whitelistOperatorSessionEnvelope } from "./application/operator-session-envelope-repository.ts";

// F1 — the safe operator session INPUT CONTRACT: serializable request envelope + caller-factory type + pure
// validators. Types-only on the core side (no SDK pulled). Module loading + execution are later slices.
export {
  validateOperatorSessionRequestEnvelope,
  validateOperatorSessionCallerFactory,
  validateOperatorSessionCallerFactoryResult,
} from "./application/operator-session-request.ts";
export type {
  OperatorSessionRequestEnvelope,
  OperatorSessionRenderingRequest,
  OperatorSessionCallerFactory,
  OperatorSessionCallerFactoryBundle,
  OperatorSessionCallerFactoryResult,
  OperatorSessionRequestValidation,
  OperatorSessionShapeValidation,
} from "./application/operator-session-request.ts";

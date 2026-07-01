// operator-runtime deployment: run a session from an ALREADY-LOADED caller module (Implementation 043-F2,
// in-`src` part). It takes a caller module object (the out-of-`src` executable did the dynamic import) + the
// assembled persistence bundle, validates the F1 contract, invokes the caller factory, and runs the session
// ONLY through runOperatorSession — persisting only the safe envelope. It reads no env, imports no SDK, does no
// dynamic import / file / network I/O, parses no Garmin, derives no RenderingRequest, composes none of the core.
//
//   caller module ≠ JSON command API ≠ remote plugin · caller factory ≠ Aurora-owned whole-core composer ·
//   caller-supplied RenderingRequest ≠ recommendation-quality proof · module loading ≠ delivery ·
//   runOperatorSession ≠ a direct underlying-runtime call · OperatorSessionEnvelope ≠ raw outcome ·
//   session run ≠ AthleteDecision · Aurora advises, the athlete decides.

import { runOperatorSession } from "../application/operator-run-service.ts";
import type {
  OperatorRunCommand,
  OperatorRunResult,
  OperatorRunServiceDependencies,
} from "../application/operator-run-service.ts";
import {
  validateOperatorSessionRequestEnvelope,
  validateOperatorSessionCallerFactory,
  validateOperatorSessionCallerFactoryResult,
} from "../application/operator-session-request.ts";
import type {
  OperatorSessionCallerFactory,
  OperatorSessionCallerFactoryBundle,
  OperatorSessionCallerFactoryResult,
  OperatorSessionRequestEnvelope,
} from "../application/operator-session-request.ts";
import type {
  TrainingSessionRepository,
} from "../application/training-session-repository.ts";
import type { OperatorSessionRunRepository } from "../application/operator-session-run-repository.ts";
import type { OperatorSessionEnvelopeRepository } from "../application/operator-session-envelope-repository.ts";
import type { DecisionCaptureLinkRepository } from "../application/decision-capture-link-repository.ts";
import type { RowStoreClient } from "../application/operator-runtime-row-store.ts";
import type { BlobStoreClient } from "../application/operator-runtime-blob-store.ts";
import type { TrainingArtifactObjectStore } from "../application/training-artifact-object-store.ts";

/** The assembled persistence bundle (from createOperatorRuntimePersistenceRepositories). */
export interface OperatorRuntimeBundle {
  readonly rowStore: RowStoreClient;
  readonly blobStore: BlobStoreClient;
  readonly repositories: {
    readonly trainingSessions: TrainingSessionRepository;
    readonly runs: OperatorSessionRunRepository;
    readonly envelopes: OperatorSessionEnvelopeRepository;
    readonly decisionLinks: DecisionCaptureLinkRepository;
  };
  readonly artifactStore: TrainingArtifactObjectStore;
}

/** The shape the caller module must export (F1 convention). */
export interface CallerModuleShape {
  readonly operatorSessionRequest?: unknown;
  readonly createOperatorSession?: unknown;
}

/** Injectable seam — defaults to the real runOperatorSession; tests inject a fake. */
export interface OperatorSessionModuleRunnerDeps {
  readonly runOperatorSession?: <T>(
    command: OperatorRunCommand<T>,
    deps: OperatorRunServiceDependencies,
  ) => Promise<OperatorRunResult>;
}

/** A SAFE result — refs + status codes only; never reflection text / raw outcome / secrets. */
export type OperatorSessionModuleRunResult =
  | { readonly status: "invalid-request"; readonly reasons: readonly string[] }
  | { readonly status: "invalid-factory"; readonly reasons: readonly string[] }
  | { readonly status: "invalid-factory-result"; readonly reasons: readonly string[] }
  | { readonly status: "training-session-not-found"; readonly trainingSessionRef: string }
  | {
      readonly status: "completed";
      readonly trainingSessionRef: string;
      readonly runRef?: string;
      readonly envelopeRecordRef?: string;
      readonly decisionCaptureLinkRef?: string;
      readonly sessionStatus?: string;
    };

/**
 * Validate the caller module against the F1 contract, then run ONE session through runOperatorSession and return
 * only safe refs/status. It never calls invokeOperatorSession or the underlying runtime directly, never derives
 * a renderable, never delivers, and never creates an AthleteDecision — the caller factory supplies command + deps.
 */
export async function runOperatorSessionFromCallerModule(
  callerModule: CallerModuleShape,
  bundle: OperatorRuntimeBundle,
  deps: OperatorSessionModuleRunnerDeps = {},
): Promise<OperatorSessionModuleRunResult> {
  const requestValidation = validateOperatorSessionRequestEnvelope(callerModule.operatorSessionRequest);
  if (requestValidation.status !== "ok") {
    return { status: "invalid-request", reasons: requestValidation.reasons };
  }
  const request: OperatorSessionRequestEnvelope = requestValidation.request;

  const trainingSession = await bundle.repositories.trainingSessions.findById(request.trainingSessionId);
  if (trainingSession === undefined) {
    return { status: "training-session-not-found", trainingSessionRef: String(request.trainingSessionId) };
  }

  const factoryValidation = validateOperatorSessionCallerFactory(callerModule.createOperatorSession);
  if (factoryValidation.status !== "ok") {
    return { status: "invalid-factory", reasons: factoryValidation.reasons };
  }
  const factory = callerModule.createOperatorSession as OperatorSessionCallerFactory<unknown>;

  const factoryBundle: OperatorSessionCallerFactoryBundle = {
    repositories: bundle.repositories,
    artifactStore: bundle.artifactStore,
    rowStore: bundle.rowStore,
    blobStore: bundle.blobStore,
    request,
    trainingSession,
  };

  const produced: unknown = await factory(factoryBundle);
  const resultValidation = validateOperatorSessionCallerFactoryResult(produced);
  if (resultValidation.status !== "ok") {
    return { status: "invalid-factory-result", reasons: resultValidation.reasons };
  }
  const { command, deps: sessionDeps } = produced as OperatorSessionCallerFactoryResult<unknown>;

  // build the OperatorRunCommand from the validated envelope ids/timestamps + the caller-supplied command/deps
  const runCommand: OperatorRunCommand<unknown> = {
    trainingSessionId: request.trainingSessionId,
    runId: request.runId,
    envelopeRecordId: request.envelopeRecordId,
    decisionCaptureLinkId: request.decisionCaptureLinkId,
    startedAt: request.startedAt,
    completedAt: request.completedAt,
    recordedAt: request.recordedAt,
    session: { command, deps: sessionDeps },
  };

  const runServiceDeps: OperatorRunServiceDependencies = {
    trainingSessions: bundle.repositories.trainingSessions,
    runs: bundle.repositories.runs,
    envelopes: bundle.repositories.envelopes,
    decisionLinks: bundle.repositories.decisionLinks,
  };

  const run = await (deps.runOperatorSession ?? runOperatorSession)(runCommand, runServiceDeps);

  return {
    status: "completed",
    trainingSessionRef: String(run.trainingSessionRef),
    ...(run.runRef !== undefined ? { runRef: String(run.runRef) } : {}),
    ...(run.envelopeRecordRef !== undefined ? { envelopeRecordRef: String(run.envelopeRecordRef) } : {}),
    ...(run.decisionCaptureLinkRef !== undefined ? { decisionCaptureLinkRef: String(run.decisionCaptureLinkRef) } : {}),
    ...(run.envelope !== undefined ? { sessionStatus: run.envelope.status } : {}),
  };
}

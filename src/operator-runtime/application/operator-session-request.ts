// operator-runtime application: the safe operator session INPUT CONTRACT (Implementation 043-F1).
//
// Spec 043F / Tech Spec 043F-A decided the first honest input is a CALLER-PROVIDED MODULE/FACTORY, because
// OfflineReflectionRuntimeDependencies are FUNCTION-BEARING and cannot be carried by JSON/stdin/CLI. This file
// is the in-`src`, testable half of that contract: a small serializable request envelope + the caller-factory
// type + PURE validators. It loads no module, reads no env/file, parses no Garmin, runs no session, calls
// nothing, and composes none of the core.
//
//   OperatorSessionRequestEnvelope ≠ OfflineReflectionRuntimeCommand ≠ whole-core composer ≠ Garmin parser ·
//   caller-supplied RenderingRequest ≠ recommendation-quality proof · TrainingSessionRecord reference ≠ Evidence ·
//   TrainingSessionRawArtifactRef ≠ truth · caller factory ≠ API endpoint ≠ delivery channel ≠ AthleteDecision source ·
//   module loading ≠ F1 · session run ≠ athlete decision · Aurora advises, the athlete decides.

import type { Timestamp } from "../../shared-kernel/time.ts";
import type {
  OfflineReflectionRuntimeCommand,
  OfflineReflectionRuntimeDependencies,
} from "../../modules/application-orchestration/index.ts";

import type { TrainingSessionId, TrainingSessionRecord } from "./training-session-record.ts";
import type { TrainingSessionRepository } from "./training-session-repository.ts";
import type { OperatorSessionRunId, OperatorSessionRunRepository } from "./operator-session-run-repository.ts";
import type {
  OperatorSessionEnvelopeRecordId,
  OperatorSessionEnvelopeRepository,
} from "./operator-session-envelope-repository.ts";
import type { DecisionCaptureLinkId, DecisionCaptureLinkRepository } from "./decision-capture-link-repository.ts";
import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import type { BlobStoreClient } from "./operator-runtime-blob-store.ts";
import type { TrainingArtifactObjectStore } from "./training-artifact-object-store.ts";

/** The caller-supplied reflection renderable — derived from the public command type; NOT imported from rendering. */
export type OperatorSessionRenderingRequest = OfflineReflectionRuntimeCommand<unknown>["request"];

/**
 * The serializable half of a session input: a REFERENCE to a persisted TrainingSessionRecord + a caller-supplied
 * RenderingRequest + operator provenance + injected deterministic refs/timestamps. It is NOT an
 * OfflineReflectionRuntimeCommand and carries no raw artifact payload, Evidence/ObservationSet/Signal,
 * AthleteDecision, delivery request, a live provider configuration, or a secret.
 */
export interface OperatorSessionRequestEnvelope {
  readonly trainingSessionId: TrainingSessionId; // a reference — operational metadata, not Evidence
  readonly athleteRef: string;
  readonly operatorRef: string; // operator/session provenance
  readonly renderingRequest: OperatorSessionRenderingRequest; // caller-supplied; admitted later, never derived here
  readonly runId: OperatorSessionRunId;
  readonly envelopeRecordId: OperatorSessionEnvelopeRecordId;
  readonly decisionCaptureLinkId: DecisionCaptureLinkId;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly recordedAt: Timestamp;
}

/** The material a caller factory receives — explicit runtime collaborators only; it composes nothing for them. */
export interface OperatorSessionCallerFactoryBundle {
  readonly repositories: {
    readonly trainingSessions: TrainingSessionRepository;
    readonly runs: OperatorSessionRunRepository;
    readonly envelopes: OperatorSessionEnvelopeRepository;
    readonly decisionLinks: DecisionCaptureLinkRepository;
  };
  readonly artifactStore: TrainingArtifactObjectStore;
  readonly rowStore: RowStoreClient;
  readonly blobStore: BlobStoreClient;
  readonly request: OperatorSessionRequestEnvelope;
  readonly trainingSession: TrainingSessionRecord;
}

/** What a caller factory must return — exactly the function-bearing session command + deps for the seam. */
export interface OperatorSessionCallerFactoryResult<TSubmission> {
  readonly command: OfflineReflectionRuntimeCommand<TSubmission>;
  readonly deps: OfflineReflectionRuntimeDependencies<TSubmission>;
}

/**
 * The honest input contract: a caller-provided function that, given the assembled bundle, returns the exact
 * command + (function-bearing) deps for runOperatorSession. Async-capable. The caller composes; Aurora does not.
 */
export type OperatorSessionCallerFactory<TSubmission> = (
  bundle: OperatorSessionCallerFactoryBundle,
) => OperatorSessionCallerFactoryResult<TSubmission> | Promise<OperatorSessionCallerFactoryResult<TSubmission>>;

export type OperatorSessionRequestValidation =
  | { readonly status: "ok"; readonly request: OperatorSessionRequestEnvelope }
  | { readonly status: "invalid"; readonly reasons: readonly string[] };

export type OperatorSessionShapeValidation =
  | { readonly status: "ok" }
  | { readonly status: "invalid"; readonly reasons: readonly string[] };

// Fields that must NEVER appear on the envelope (it is a reference + caller renderable, not domain truth / a
// command / a decision / a delivery request / credentials). Exact-key match (so decisionCaptureLinkId is fine).
const FORBIDDEN_ENVELOPE_KEYS: readonly string[] = [
  "rawArtifact", "rawArtifactPayload", "rawPayload", "payload", "body", "bytes",
  "fit", "fitData", "tcx", "csv", "garmin", "garminMetrics", "metrics", "measurements",
  "observation", "observations", "observationSet", "evidence", "signal", "signals",
  "athleteDecision", "decision", "delivery", "deliveryTarget", "deliveredArtifact",
  "provider", "liveProvider", "secret", "credential", "apiKey", "token",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function isTimestamp(value: unknown): boolean {
  return isObject(value) && typeof value["epochMillis"] === "number" && typeof value["iso"] === "string";
}

/**
 * Validate the request envelope shape — PURE, structural. It checks required ids/refs/provenance/timestamps and a
 * present RenderingRequest (object only — admission/quality is NOT decided here), and rejects any forbidden field.
 * It calls nothing, loads nothing, reads no env/file, parses no Garmin.
 */
export function validateOperatorSessionRequestEnvelope(input: unknown): OperatorSessionRequestValidation {
  const reasons: string[] = [];
  if (!isObject(input)) {
    return { status: "invalid", reasons: ["request envelope must be an object"] };
  }
  for (const key of ["trainingSessionId", "athleteRef", "operatorRef", "runId", "envelopeRecordId", "decisionCaptureLinkId"]) {
    if (!isNonEmptyString(input[key])) reasons.push(`missing or empty '${key}'`);
  }
  if (!isObject(input["renderingRequest"])) {
    reasons.push("missing caller-supplied 'renderingRequest' (must be a RenderingRequest object; admission ≠ recommendation quality)");
  }
  for (const key of ["startedAt", "completedAt", "recordedAt"]) {
    if (!isTimestamp(input[key])) reasons.push(`missing or malformed timestamp '${key}'`);
  }
  for (const forbidden of FORBIDDEN_ENVELOPE_KEYS) {
    if (forbidden in input) reasons.push(`forbidden field '${forbidden}' (envelope carries no raw artifact/Evidence/decision/delivery/secret)`);
  }
  if (reasons.length > 0) return { status: "invalid", reasons: Object.freeze(reasons) };
  return { status: "ok", request: input as unknown as OperatorSessionRequestEnvelope };
}

/** Validate that the caller factory is a function — PURE. It does NOT invoke the factory. */
export function validateOperatorSessionCallerFactory(value: unknown): OperatorSessionShapeValidation {
  if (typeof value !== "function") {
    return { status: "invalid", reasons: ["caller factory must be a function (bundle) => { command, deps }"] };
  }
  return { status: "ok" };
}

/**
 * Validate a caller factory's RETURNED value carries both a command and deps object — PURE, structural. It does
 * not run the command, call the seam, or inspect dependency internals.
 */
export function validateOperatorSessionCallerFactoryResult(value: unknown): OperatorSessionShapeValidation {
  const reasons: string[] = [];
  if (!isObject(value)) {
    return { status: "invalid", reasons: ["caller factory result must be an object with command + deps"] };
  }
  if (!isObject(value["command"])) reasons.push("missing 'command' (OfflineReflectionRuntimeCommand)");
  if (!isObject(value["deps"])) reasons.push("missing 'deps' (OfflineReflectionRuntimeDependencies)");
  if (reasons.length > 0) return { status: "invalid", reasons: Object.freeze(reasons) };
  return { status: "ok" };
}

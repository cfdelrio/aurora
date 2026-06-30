// operator-runtime application: TrainingSessionRecord + TrainingSessionRawArtifactRef (+ factories).
//
// OPERATIONAL / runtime persistence metadata about a training session ingested for an
// operator-mediated reflection (a Garmin export or a manual entry). This is NOT domain truth:
//   TrainingSessionRecord ≠ Evidence · TrainingSessionRecord ≠ ObservationSet ·
//   TrainingSessionRawArtifactRef ≠ truth · a Garmin/manual artifact ≠ truth.
// It carries NO measurements and NO derived meaning — only an opaque reference to the raw artifact
// and operational provenance (which athlete, what origin, when ingested). The raw artifact ref is an
// OPAQUE handle a future object-storage adapter resolves; it never embeds the artifact content and
// asserts nothing about correctness. Ids + timestamps are injected (no Date.now, no crypto here).

import type { Timestamp } from "../../shared-kernel/time.ts";

declare const trainingSessionIdBrand: unique symbol;
export type TrainingSessionId = string & { readonly [trainingSessionIdBrand]: true };

/** How a training session reached Aurora. Operational origin only — carries no trust ranking. */
export type TrainingSessionSource = "garmin" | "manual";

const SOURCES: readonly TrainingSessionSource[] = ["garmin", "manual"];

/**
 * An OPAQUE reference to a raw training artifact (e.g. a Garmin .fit export or a manual note blob).
 * Provenance, not truth: it locates the artifact in (future) object storage and describes its origin;
 * it never contains the artifact bytes, and asserts nothing about the artifact's correctness.
 */
export interface TrainingSessionRawArtifactRef {
  readonly source: TrainingSessionSource;
  /** opaque storage handle a future object-storage adapter resolves — never the content itself */
  readonly reference: string;
  /** descriptive media type, advisory only (e.g. "application/vnd.ant.fit", "text/plain") */
  readonly mediaType?: string;
  /** when the artifact was captured at the source (device / manual entry time) */
  readonly capturedAt?: Timestamp;
}

export interface TrainingSessionRawArtifactRefInput {
  readonly source: TrainingSessionSource;
  readonly reference: string;
  readonly mediaType?: string;
  readonly capturedAt?: Timestamp;
}

export function trainingSessionRawArtifactRef(
  input: TrainingSessionRawArtifactRefInput,
): TrainingSessionRawArtifactRef {
  if (input === null || typeof input !== "object") {
    throw new Error("TrainingSessionRawArtifactRef requires source and reference");
  }
  if (!SOURCES.includes(input.source)) {
    throw new Error(
      `TrainingSessionRawArtifactRef.source must be 'garmin' or 'manual', got: ${String(input.source)}`,
    );
  }
  if (typeof input.reference !== "string" || input.reference.length === 0) {
    throw new Error("TrainingSessionRawArtifactRef requires a non-empty opaque reference handle");
  }
  return Object.freeze({
    source: input.source,
    reference: input.reference,
    ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
    ...(input.capturedAt !== undefined ? { capturedAt: input.capturedAt } : {}),
  });
}

/**
 * Operational metadata about an ingested training session, persisted so a later operator run can be
 * traced back to its source. It holds no measurements and no derived meaning — extracting meaning is
 * the core's job, reached only behind invokeOperatorSession.
 */
export interface TrainingSessionRecord {
  readonly id: TrainingSessionId;
  readonly athleteRef: string;
  readonly source: TrainingSessionSource;
  /** an opaque handle to the raw artifact (provenance), if one was retained */
  readonly artifact?: TrainingSessionRawArtifactRef;
  /** optional operator-supplied label; descriptive only */
  readonly label?: string;
  /** when the session occurred / was captured at the source */
  readonly capturedAt?: Timestamp;
  /** when Aurora ingested and recorded this metadata */
  readonly recordedAt: Timestamp;
}

export interface TrainingSessionRecordInput {
  readonly id: TrainingSessionId;
  readonly athleteRef: string;
  readonly source: TrainingSessionSource;
  readonly artifact?: TrainingSessionRawArtifactRef;
  readonly label?: string;
  readonly capturedAt?: Timestamp;
  readonly recordedAt: Timestamp;
}

export function trainingSessionRecord(input: TrainingSessionRecordInput): TrainingSessionRecord {
  if (input === null || typeof input !== "object") {
    throw new Error("TrainingSessionRecord requires id, athleteRef, source and recordedAt");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("TrainingSessionRecord requires a non-empty id");
  }
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("TrainingSessionRecord requires a non-empty athleteRef");
  }
  if (!SOURCES.includes(input.source)) {
    throw new Error(
      `TrainingSessionRecord.source must be 'garmin' or 'manual', got: ${String(input.source)}`,
    );
  }
  if (input.recordedAt === undefined) {
    throw new Error("TrainingSessionRecord requires recordedAt");
  }
  return Object.freeze({
    id: input.id,
    athleteRef: input.athleteRef,
    source: input.source,
    ...(input.artifact !== undefined ? { artifact: input.artifact } : {}),
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.capturedAt !== undefined ? { capturedAt: input.capturedAt } : {}),
    recordedAt: input.recordedAt,
  });
}

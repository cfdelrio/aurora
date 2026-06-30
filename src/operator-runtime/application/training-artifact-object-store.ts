// operator-runtime application: the raw-artifact OBJECT-STORAGE PORT (Implementation 043-C2).
//
// A provenance-safe storage seam for opaque raw training artifacts (a Garmin .fit/.tcx export, a .csv,
// a manual note blob). It is a PORT only — not a cloud implementation, not filesystem persistence,
// not a DB. The stored artifact is treated as OPAQUE provenance and is NEVER interpreted:
//   raw artifact ≠ truth · Garmin artifact ≠ truth · artifact ref ≠ Evidence ·
//   artifact payload ≠ ObservationSet · storage success ≠ understanding ≠ athlete decision ·
//   object storage port ≠ a cloud implementation.
// The store never parses FIT/TCX/CSV, infers no metrics, creates no Evidence/ObservationSet/Signal/
// AthleteDecision, runs no session, persists no envelope, and delivers nothing. Refs + timestamps are
// injected (no Date.now, no crypto here).

import type { Timestamp } from "../../shared-kernel/time.ts";
import type { TrainingSessionSource } from "./training-session-record.ts";
import {
  trainingSessionRawArtifactRef,
  type TrainingSessionRawArtifactRef,
} from "./training-session-record.ts";

/** Descriptive metadata about a stored artifact — never derived meaning, never parsed content. */
export interface TrainingArtifactMetadata {
  /** opaque storage handle — never parsed for meaning */
  readonly reference: string;
  readonly source: TrainingSessionSource;
  /** content type / format if supplied (advisory only, e.g. "application/vnd.ant.fit") */
  readonly mediaType?: string;
  /** original filename if supplied (advisory only) */
  readonly filename?: string;
  readonly createdAt: Timestamp;
}

/** A stored opaque artifact: descriptive metadata + the opaque payload, returned unchanged. */
export interface StoredTrainingArtifact extends TrainingArtifactMetadata {
  /** opaque bytes/string — provenance, not truth; stored and returned verbatim, never parsed */
  readonly payload: string;
}

export interface PutTrainingArtifactInput {
  readonly reference: string;
  readonly source: TrainingSessionSource;
  readonly payload: string;
  readonly mediaType?: string;
  readonly filename?: string;
  readonly createdAt: Timestamp;
}

/**
 * Object-storage-style port for opaque raw training artifacts. Minimal surface:
 *   put  — store an opaque artifact under an injected ref, returning the stored artifact
 *   get  — read the opaque artifact (payload + metadata) by ref
 *   head — metadata lookup by ref (no payload)
 * No parse, no infer, no deliver, no session.
 */
export interface TrainingArtifactObjectStore {
  put(input: PutTrainingArtifactInput): StoredTrainingArtifact;
  get(reference: string): StoredTrainingArtifact | undefined;
  head(reference: string): TrainingArtifactMetadata | undefined;
}

/** Build the immutable stored-artifact value. Opaque: it validates shape only, never the content. */
export function storedTrainingArtifact(input: PutTrainingArtifactInput): StoredTrainingArtifact {
  if (input === null || typeof input !== "object") {
    throw new Error("StoredTrainingArtifact requires reference, source, payload, createdAt");
  }
  if (typeof input.reference !== "string" || input.reference.length === 0) {
    throw new Error("StoredTrainingArtifact requires a non-empty opaque reference handle");
  }
  if (input.source !== "garmin" && input.source !== "manual") {
    throw new Error(`StoredTrainingArtifact.source must be 'garmin' or 'manual', got: ${String(input.source)}`);
  }
  if (typeof input.payload !== "string") {
    throw new Error("StoredTrainingArtifact.payload must be an opaque string (never parsed)");
  }
  if (input.createdAt === undefined) {
    throw new Error("StoredTrainingArtifact requires createdAt");
  }
  return Object.freeze({
    reference: input.reference,
    source: input.source,
    ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
    ...(input.filename !== undefined ? { filename: input.filename } : {}),
    createdAt: input.createdAt,
    payload: input.payload,
  });
}

/**
 * Map a stored artifact to a TrainingSessionRawArtifactRef (provenance handle) WITHOUT parsing the
 * payload — so the ref can be attached to a TrainingSessionRecord. The ref carries the opaque handle
 * and origin only; it asserts nothing about correctness and contains no content.
 */
export function toRawArtifactRef(stored: StoredTrainingArtifact): TrainingSessionRawArtifactRef {
  return trainingSessionRawArtifactRef({
    source: stored.source,
    reference: stored.reference,
    ...(stored.mediaType !== undefined ? { mediaType: stored.mediaType } : {}),
    capturedAt: stored.createdAt,
  });
}

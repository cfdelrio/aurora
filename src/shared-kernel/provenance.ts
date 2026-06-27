// shared-kernel: provenance and source.
// Provenance is born here in the reasoning chain. Every observation must carry it.
// Source names where an observation came from; it carries NO trust ranking (trust is contextual, deferred).

import type { Timestamp } from "./time.ts";

export type Source =
  | "device"
  | "athlete-report"
  | "coach-report"
  | "manual"
  | "imported-plan"
  | "competition-result"
  | "system-derived";

const SOURCES: readonly Source[] = [
  "device",
  "athlete-report",
  "coach-report",
  "manual",
  "imported-plan",
  "competition-result",
  "system-derived",
];

export interface Provenance {
  /** where it came from */
  readonly source: Source;
  /** when the source captured/recorded the thing */
  readonly captureTime: Timestamp;
  /** when Aurora received and recorded it */
  readonly recordingTime: Timestamp;
  /** opaque handle a future TraceabilityChain resolves to */
  readonly reference: string;
}

export interface ProvenanceInput {
  readonly source: Source;
  readonly captureTime: Timestamp;
  readonly recordingTime: Timestamp;
  readonly reference: string;
}

/**
 * Smart constructor. An observation cannot exist without complete provenance,
 * so this refuses to build partial provenance even when called from an untyped boundary.
 */
export function provenance(input: ProvenanceInput): Provenance {
  if (input === null || typeof input !== "object") {
    throw new Error("Provenance requires source, captureTime, recordingTime and reference");
  }
  if (!SOURCES.includes(input.source)) {
    throw new Error(`Provenance.source must be a known Source, got: ${String(input.source)}`);
  }
  if (input.captureTime === undefined || input.recordingTime === undefined) {
    throw new Error("Provenance requires captureTime and recordingTime");
  }
  if (typeof input.reference !== "string" || input.reference.length === 0) {
    throw new Error("Provenance requires a non-empty reference handle");
  }
  return Object.freeze({
    source: input.source,
    captureTime: input.captureTime,
    recordingTime: input.recordingTime,
    reference: input.reference,
  });
}

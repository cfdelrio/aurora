// observation domain: quality-before-meaning.
// Quality describes the recording, never what it means. It travels with the observation and is never stripped.
// Re-assessment is non-destructive (a new quality value), never an in-place edit.

export type ObservationQualityStatus =
  | "complete"
  | "partial"
  | "missing"
  | "inconsistent"
  | "corrupted"
  | "suspicious"
  | "stale"
  | "source-conflicted"
  | "context-missing";

export interface ObservationQuality {
  readonly status: ObservationQualityStatus;
  readonly reason: string;
}

const STATUSES: readonly ObservationQualityStatus[] = [
  "complete",
  "partial",
  "missing",
  "inconsistent",
  "corrupted",
  "suspicious",
  "stale",
  "source-conflicted",
  "context-missing",
];

export function observationQuality(
  status: ObservationQualityStatus,
  reason: string,
): ObservationQuality {
  if (!STATUSES.includes(status)) {
    throw new Error(`Unknown ObservationQualityStatus: ${String(status)}`);
  }
  if (typeof reason !== "string" || reason.length === 0) {
    throw new Error("ObservationQuality requires a non-empty reason");
  }
  return Object.freeze({ status, reason });
}

/** Convenience for a recording with no detected quality limitation. Still explicit, never hidden. */
export function qualityComplete(
  reason = "recorded without detected quality limitation",
): ObservationQuality {
  return observationQuality("complete", reason);
}

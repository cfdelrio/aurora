// observation application: the result of manual ingestion. The adapter ACCEPTS as ObservationSet,
// PARTIALLY ACCEPTS with limitations, or REJECTS with explicit reasons — and never mutates anything
// on rejection. The event candidate is ref-only data; the adapter itself appends no event record.

import type { ObservationSet } from "../domain/index.ts";
import type { ObservationQualityStatus } from "../domain/index.ts";
import type { ObservationSetId } from "../../../shared-kernel/ids.ts";

/** Closed catalog — transparent refusals to record input that cannot be faithfully represented. */
export type ManualInputRejectionReason =
  | "missing-athlete-ref"
  | "missing-occurrence-time"
  | "invalid-timestamp"
  | "unsupported-entry-kind"
  | "ambiguous-unrepresentable"
  | "no-faithful-observation"
  | "malformed-provenance"
  | "inference-smuggled-as-fact"
  | "empty-submission";

export const MANUAL_INPUT_REJECTION_REASONS: readonly ManualInputRejectionReason[] = [
  "missing-athlete-ref",
  "missing-occurrence-time",
  "invalid-timestamp",
  "unsupported-entry-kind",
  "ambiguous-unrepresentable",
  "no-faithful-observation",
  "malformed-provenance",
  "inference-smuggled-as-fact",
  "empty-submission",
];

/** Closed catalog — what could not be faithfully recorded (reported, never inferred away). */
export type ManualInputLimitation =
  | "missing-duration"
  | "missing-intensity"
  | "ambiguous-field"
  | "source-limited"
  | "partial-report"
  | "unverified-self-report"
  | "unsupported-field-ignored";

export const MANUAL_INPUT_LIMITATIONS: readonly ManualInputLimitation[] = [
  "missing-duration",
  "missing-intensity",
  "ambiguous-field",
  "source-limited",
  "partial-report",
  "unverified-self-report",
  "unsupported-field-ignored",
];

/** Quality of the INPUT as source material — never of the athlete. Maps onto ObservationQuality. */
export type ManualInputQuality =
  | "complete"
  | "partial"
  | "ambiguous"
  | "conflicting"
  | "low-confidence"
  | "unverified"
  | "source-limited";

export const MANUAL_INPUT_QUALITIES: readonly ManualInputQuality[] = [
  "complete",
  "partial",
  "ambiguous",
  "conflicting",
  "low-confidence",
  "unverified",
  "source-limited",
];

/** Map the outcome-level input-quality summary onto the existing per-observation quality status. */
export function observationQualityStatusFor(quality: ManualInputQuality): ObservationQualityStatus {
  switch (quality) {
    case "complete":
      return "complete";
    case "partial":
      return "partial";
    case "ambiguous":
      return "context-missing";
    case "conflicting":
      return "source-conflicted";
    case "low-confidence":
      return "suspicious";
    case "unverified":
      return "suspicious";
    case "source-limited":
      return "source-conflicted";
  }
}

/** Ref-only hint enabling a neutral harness to append ObservationSetRecorded. The adapter builds NO event. */
export interface ObservationSetRecordedCandidate {
  readonly type: "ObservationSetRecorded";
  readonly observationSetId: ObservationSetId;
  readonly occasion: string;
}

export type ManualInputIngestionOutcome =
  | {
      readonly status: "accepted" | "partially-accepted";
      readonly observationSet: ObservationSet;
      readonly observationSetId: ObservationSetId;
      readonly acceptedCount: number;
      readonly quality: ManualInputQuality;
      readonly limitations: readonly ManualInputLimitation[];
      readonly eventCandidate: ObservationSetRecordedCandidate;
    }
  | {
      readonly status: "rejected";
      readonly reasons: readonly ManualInputRejectionReason[];
    };

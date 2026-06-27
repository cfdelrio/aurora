// observation application: ManualInputSubmission — the raw, manually-supplied input entering Aurora.
// It is a REPORT, faithfully recorded later; it is NOT interpreted truth. It carries no interpreted
// meaning field (no readiness/fatigue/impact/capacity) — only what was reported, plus refs/context.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Source } from "../../../shared-kernel/provenance.ts";

/**
 * A single manually-reported entry. Implemented this slice: subjective-report, context-note,
 * athlete-decision-report, missing-data. `measured-value` is RESERVED (no unit interpretation yet) —
 * it is recorded as a limitation or rejection, never mapped to a measured observation here.
 */
export type ManualInputEntry =
  | { readonly kind: "subjective-report"; readonly words: string; readonly fieldLabel?: string }
  | { readonly kind: "context-note"; readonly words: string; readonly fieldLabel?: string }
  | {
      readonly kind: "athlete-decision-report";
      readonly words: string;
      readonly decisionSupportCaseRef?: string;
      readonly athleteDecisionRef?: string;
    }
  | { readonly kind: "missing-data"; readonly expected: string; readonly reason?: string }
  | { readonly kind: "measured-value"; readonly label: string; readonly rawValue: string; readonly unit?: string };

export interface ManualInputSubmission {
  /** external reference / id of this submission (becomes part of the provenance reference handle) */
  readonly submissionRef: string;
  /** the subject this report is about (required) */
  readonly athleteRef: string;
  /** when the report was submitted to Aurora */
  readonly submittedAt: Timestamp;
  /** the reported occurrence time (must not be after submittedAt) */
  readonly occurredAt: Timestamp;
  /** session label / context — becomes the ObservationSet occasion */
  readonly occasion: string;
  /** who/what reported it (preserved in the provenance reference; the ingestion mechanism is "manual") */
  readonly reporter: Source;
  readonly entries: readonly ManualInputEntry[];
  /** expected-but-maybe-missing fields for the occasion */
  readonly expected?: readonly string[];
  /** optional relation refs — carried as context, never interpreted */
  readonly purposeVersionRef?: string;
  readonly decisionSupportCaseRef?: string;
  readonly athleteDecisionRef?: string;
}

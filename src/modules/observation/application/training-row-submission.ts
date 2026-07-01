// observation application: manual/CSV training-row intake (Impl 044-A1, Tech Spec 044-A).
//
// A PURE mapper — plain already-parsed row data in, an existing ManualInputSubmission out. It performs
// NO file I/O, uses NO CSV library, and imports NO new dependency: rows are handed in as plain objects
// by the caller (which owns however the file/manual-summary text was turned into rows). It never calls
// ingestManualInput itself — that stays the caller's responsibility, exactly as Impl 013 already works.
//
//   TrainingSummaryRow ≠ truth · a training row ≠ Evidence · a training row ≠ a detected deviation ·
//   artifactRef ≠ truth · provenance ≠ proof · mapping success ≠ recommendation quality ·
//   Aurora advises, the athlete decides; Aurora never presents inference as fact.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Source } from "../../../shared-kernel/provenance.ts";
import type { ManualInputEntry, ManualInputSubmission } from "./manual-input-submission.ts";

/** One structured training-summary/CSV-derived measurement. Plain data — never a parsed file handle. */
export interface TrainingSummaryRow {
  /** row/line reference (e.g. a CSV row id) — preserved in provenance, never dropped */
  readonly sourceRowId: string;
  readonly metric: string;
  /** the raw reported value, as text — parsed mechanically downstream, never coerced or guessed */
  readonly value: string;
  readonly unit: string;
  readonly observedAt: Timestamp;
  /** advisory only — folded into provenance, never a new Source value */
  readonly deviceLabel?: string;
  /** free-text row context — becomes its own separate context-note entry, never merged into the value */
  readonly notes?: string;
}

/** The set of rows from one manual/CSV summary, for one occasion. */
export interface TrainingRowSubmission {
  readonly submissionRef: string;
  readonly athleteRef: string;
  readonly occasion: string;
  readonly source: "manual" | "device";
  readonly sourceFormat: "manual-summary" | "csv-summary";
  /** the raw artifact this submission was derived from, if any — provenance, never truth */
  readonly artifactRef?: string;
  readonly submittedAt: Timestamp;
  readonly occurredAt: Timestamp;
  readonly rows: readonly TrainingSummaryRow[];
}

function composeSourceRowRef(row: TrainingSummaryRow): string {
  const parts = [`row:${row.sourceRowId}`, `observedAt:${row.observedAt.iso}`];
  if (row.deviceLabel !== undefined) parts.push(`device:${row.deviceLabel}`);
  return parts.join("|");
}

/**
 * Map a TrainingRowSubmission into an EXISTING ManualInputSubmission — never a new observation model.
 * Each row becomes one "measured-value" entry (mechanical mapping only); a row with `notes` also gets a
 * separate "context-note" entry. Pure; no I/O, no validation beyond shape, no ingestManualInput call.
 */
export function trainingRowSubmissionToManualInput(input: TrainingRowSubmission): ManualInputSubmission {
  const submissionRef =
    input.artifactRef !== undefined
      ? `${input.submissionRef}|artifact:${input.artifactRef}|format:${input.sourceFormat}`
      : `${input.submissionRef}|format:${input.sourceFormat}`;

  const entries: ManualInputEntry[] = [];
  for (const row of input.rows) {
    entries.push({
      kind: "measured-value",
      label: row.metric,
      rawValue: row.value,
      unit: row.unit,
      sourceRowRef: composeSourceRowRef(row),
    });
    if (row.notes !== undefined) {
      entries.push({
        kind: "context-note",
        words: row.notes,
        fieldLabel: `row:${row.sourceRowId}`,
      });
    }
  }

  return {
    submissionRef,
    athleteRef: input.athleteRef,
    submittedAt: input.submittedAt,
    occurredAt: input.occurredAt,
    occasion: input.occasion,
    reporter: input.source as Source,
    entries,
  };
}

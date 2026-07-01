// observation module — PUBLIC SURFACE.
// Intake only: build immutable, sourced, quality-aware, provenance-bearing observations and sets.
// This module imports only shared-kernel. It cannot construct Signal, Hypothesis, Evidence,
// Impact, Understanding, or DecisionSupport — those concepts are not in scope and not reachable here.

export * from "./domain/index.ts";
export * from "./domain/signal/index.ts";
export { recordObservationSet } from "./application/record-observation-set.ts";
export type {
  RawObservationInput,
  RecordObservationSetInput,
} from "./application/record-observation-set.ts";
export { detectSignals } from "./application/detect-signals.ts";
export type { DetectSignalsInput } from "./application/detect-signals.ts";
export type { ObservationSetRepository } from "./application/observation-set-repository.ts";
export { InMemoryObservationSetRepository } from "./application/in-memory-observation-set-repository.ts";

// Manual Input Adapter (Impl 013) — the first real "data in" boundary. Records source material as
// ObservationSet; imports no event-recording / downstream module; detects no Signal; infers no meaning.
export { ingestManualInput } from "./application/manual-input-adapter.ts";
export type { IngestManualInputInput } from "./application/manual-input-adapter.ts";
export type { ManualInputSubmission, ManualInputEntry } from "./application/manual-input-submission.ts";
export {
  MANUAL_INPUT_REJECTION_REASONS,
  MANUAL_INPUT_LIMITATIONS,
  MANUAL_INPUT_QUALITIES,
  observationQualityStatusFor,
} from "./application/manual-input-ingestion-outcome.ts";
export type {
  ManualInputIngestionOutcome,
  ManualInputRejectionReason,
  ManualInputLimitation,
  ManualInputQuality,
  ObservationSetRecordedCandidate,
} from "./application/manual-input-ingestion-outcome.ts";

// Manual/CSV Training-Row Intake (Impl 044-A1) — a pure mapper from already-parsed structured rows into
// the EXISTING ManualInputSubmission shape. No file I/O, no CSV library, no new observation model.
export { trainingRowSubmissionToManualInput } from "./application/training-row-submission.ts";
export type { TrainingSummaryRow, TrainingRowSubmission } from "./application/training-row-submission.ts";

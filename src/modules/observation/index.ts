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

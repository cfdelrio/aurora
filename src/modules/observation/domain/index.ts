// observation domain — PUBLIC SURFACE.
// Exports ONLY intake constructors, the aggregate, and their types.
// There is intentionally no detection, scoring, inference, signal, hypothesis, or evidence here.

export { measuredObservation, subjectiveObservation, missingDataObservation } from "./observation.ts";
export type {
  Observation,
  MeasuredObservation,
  SubjectiveObservation,
  MissingDataObservation,
  Measurement,
  MeasuredObservationInput,
  SubjectiveObservationInput,
  MissingDataObservationInput,
} from "./observation.ts";

export { observationQuality, qualityComplete } from "./observation-quality.ts";
export type { ObservationQuality, ObservationQualityStatus } from "./observation-quality.ts";

export { ObservationSet } from "./observation-set.ts";
export type {
  SupersessionRecord,
  Completeness,
  TimeRange,
  ObservationSetCreateInput,
  ObservationSetState,
} from "./observation-set.ts";

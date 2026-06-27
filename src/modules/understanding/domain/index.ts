// understanding domain — PUBLIC SURFACE.
// Per-dimension understanding from hypothesis lifecycle outcomes. No decision, recommendation,
// warning, inquiry, voice selection, or athlete-decision symbol. SafeVoiceCeiling is a ceiling,
// not a VoiceMode.

export { UnderstandingProfile } from "./understanding-profile.ts";
export type { InitializeProfileInput, StaleReason } from "./understanding-profile.ts";
export type { UnderstandingProfileId } from "./ids.ts";

export { understandingDimension, dimensionKey } from "./understanding-dimension.ts";
export type { UnderstandingDimension } from "./understanding-dimension.ts";

export type { UnderstandingLevel } from "./understanding-level.ts";
export { LEVEL_ORDER } from "./understanding-level.ts";

export { reasoningOutcome, traceToHypothesisOutcome } from "./reasoning-outcome.ts";
export type {
  ReasoningOutcome,
  ReasoningOutcomeInput,
  OutcomeKind,
  TraceToHypothesisOutcome,
} from "./reasoning-outcome.ts";

export type { SurvivedChallenge } from "./survived-challenge.ts";
export { surprise } from "./surprise.ts";
export type { Surprise, SurpriseKind } from "./surprise.ts";
export { fresh, stale } from "./staleness.ts";
export type { Staleness, StalenessStatus } from "./staleness.ts";
export { fragility } from "./fragility.ts";
export type { Fragility, FragilityLevel } from "./fragility.ts";

export type { UnderstandingChange, UnderstandingChangeReason } from "./understanding-change.ts";
export type { DimensionUnderstanding } from "./dimension-understanding.ts";

export { deriveSafeVoiceCeiling } from "./understanding-assessment.ts";
export type { UnderstandingAssessment, SafeVoiceCeiling } from "./understanding-assessment.ts";

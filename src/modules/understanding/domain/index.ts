// understanding domain — PUBLIC SURFACE.
// Per-dimension understanding from hypothesis lifecycle outcomes. No decision, recommendation,
// warning, inquiry, voice selection, or athlete-decision symbol. SafeVoiceCeiling is a ceiling,
// not a VoiceMode.

export { UnderstandingProfile } from "./understanding-profile.ts";
export type {
  InitializeProfileInput,
  StaleReason,
  UnderstandingProfileState,
} from "./understanding-profile.ts";
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

export { deriveSafeVoiceCeiling, clampCeilingByFreshness, applyFreshness } from "./understanding-assessment.ts";
export type { UnderstandingAssessment, SafeVoiceCeiling } from "./understanding-assessment.ts";

// Projection freshness & refresh (Impl 008). UnderstandingAssessment is the first projection target.
export { currentFreshness, projectionFreshness, isFullyEnabling } from "./projection-freshness.ts";
export type {
  ProjectionFreshness,
  ProjectionFreshnessStatus,
  StalenessReason,
} from "./projection-freshness.ts";
export {
  projectionSourceRef,
  projectionTrace,
  traceReferences,
  projectionLimitations,
} from "./projection-source-ref.ts";
export type {
  ProjectionSourceRef,
  ProjectionSourceKind,
  ProjectionTrace,
  ProjectionLimitations,
} from "./projection-source-ref.ts";
export { refreshTrigger } from "./refresh-trigger.ts";
export type { RefreshTrigger, RefreshTriggerKind, RefreshTriggerScope } from "./refresh-trigger.ts";
export { projectionRefreshPolicy, freshnessFromDecision } from "./refresh-policy.ts";
export type {
  ProjectionRefreshDecision,
  ProjectionRefreshDecisionKind,
  ProjectionRefreshPolicyInput,
} from "./refresh-policy.ts";

// athlete domain — PUBLIC SURFACE (Purpose-first slice).
// Owns the athlete's declared, versioned, append-only Purpose. It exposes NO inferred state,
// capacity, readiness, or fatigue -- those are not in scope and not reachable here. This module
// imports only shared-kernel; it never imports observation/reasoning/understanding/decision-support.

export { Athlete } from "./athlete.ts";
export type { CreateAthleteInput, CurrentPurposeView } from "./athlete.ts";
export type { AthleteId, PurposeVersionId } from "./ids.ts";
export { newAthleteId, newPurposeVersionId } from "./ids.ts";

export { purpose, ambiguousPurpose } from "./purpose.ts";
export type {
  Purpose,
  DeclaredPurpose,
  AmbiguousPurposeInput,
  PurposeStatus,
  PurposeSource,
  PurposeChangeReason,
} from "./purpose.ts";

export { purposeVersion, purposeVersionRefOf } from "./purpose-version.ts";
export type { PurposeVersion, PurposeVersionRef, CreatePurposeVersionInput } from "./purpose-version.ts";

export { purposeChanged } from "./purpose-changed.ts";
export type { PurposeChanged } from "./purpose-changed.ts";

export { purposeReinterpretationResult } from "./reinterpretation.ts";
export type {
  PurposeReinterpretationStatus,
  PurposeReinterpretationResult,
} from "./reinterpretation.ts";

export { revealedPurposeSignal } from "./revealed-purpose.ts";
export type { RevealedPurposeSignal } from "./revealed-purpose.ts";

// AthleteDecision slice (Impl 009): athlete-owned, append-only decision feedback. The decision is
// the athlete's; decision-support may only REFERENCE it. It re-enters reasoning as an Observation
// (via a neutral adapter outside athlete) -- never directly as Signal/Evidence/Understanding.
export type { AthleteDecisionId } from "./athlete-decision-id.ts";
export { newAthleteDecisionId } from "./athlete-decision-id.ts";

export { decisionChoice } from "./decision-choice.ts";
export type { DecisionChoice, DecisionChoiceInput } from "./decision-choice.ts";

export { decisionRationale } from "./decision-rationale.ts";
export type { DecisionRationale } from "./decision-rationale.ts";

export { decisionContext } from "./decision-context.ts";
export type { DecisionContext, DecisionContextInput } from "./decision-context.ts";

export { decisionOutcomeRef } from "./decision-outcome-ref.ts";
export type { DecisionOutcomeRef } from "./decision-outcome-ref.ts";

export { athleteDecision, withOutcomeRef, athleteDecisionRefOf } from "./athlete-decision.ts";
export type {
  AthleteDecision,
  AthleteDecisionInput,
  AthleteDecisionRef,
  DecisionReportSource,
} from "./athlete-decision.ts";

export { AthleteDecisionRecord, athleteDecisionAmendment } from "./athlete-decision-record.ts";
export type { AthleteDecisionAmendment } from "./athlete-decision-record.ts";

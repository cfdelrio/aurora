// decision-support domain — PUBLIC SURFACE.
// Selects the maximum responsible athlete-facing output, or Inquiry / Withholding. It never owns
// the athlete's decision, never authors claims, never commands. SafeVoiceCeiling (from understanding)
// is mapped to a VoiceMode here -- the ceiling is not a VoiceMode.

export { DecisionSupportCase } from "./decision-support-case.ts";
export type { OpenCaseInput, DecisionSupportCaseState } from "./decision-support-case.ts";
export type { DecisionOpportunityId, DecisionSupportCaseId } from "./ids.ts";

export { decisionOpportunity } from "./decision-opportunity.ts";
export type { DecisionOpportunity, DecisionOpportunityInput } from "./decision-opportunity.ts";

export { maxVoiceForCeiling, ceilingLadderRank, lowerInCeilingLadder } from "./voice-mode.ts";
export type { VoiceMode } from "./voice-mode.ts";

export { riskAssessment, noRisk } from "./risk-assessment.ts";
export type { RiskAssessment, RiskKind, RiskLevel } from "./risk-assessment.ts";

export { purposeContext } from "./purpose-alignment.ts";
export type { PurposeContext, PurposeStatus, PurposeAlignment } from "./purpose-alignment.ts";

export { gateResult, degradationReason } from "./gate-result.ts";
export type { GateResult, GateVerdict, DegradationReason } from "./gate-result.ts";

export { traceabilityVerificationResult } from "./traceability.ts";
export type { TraceabilityVerificationResult, TraceabilityStatus } from "./traceability.ts";

export {
  evidenceGate,
  understandingGate,
  purposeGate,
  riskGate,
  agencyGate,
} from "./gates.ts";

export { selectTerminalOutput } from "./voice-selection-policy.ts";
export type { VoiceSelectionInputs, VoiceSelectionResult } from "./voice-selection-policy.ts";

export { decisionSupport, inquiry, withholding } from "./terminal-output.ts";
export type {
  TerminalOutput,
  DecisionSupport,
  Inquiry,
  Withholding,
  SupportIntent,
  ProhibitedIntentMarker,
  CandidateSupport,
} from "./terminal-output.ts";

export { supportQuality, athleteDecisionRef } from "./support-quality.ts";
export type { SupportQuality, AthleteDecisionRef } from "./support-quality.ts";

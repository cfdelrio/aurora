// decision-support test helpers. (Not a .test. file.)

import { timestamp } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";
import { fragility, fresh, understandingDimension } from "../../understanding/index.ts";
import type {
  SafeVoiceCeiling,
  UnderstandingAssessment,
  UnderstandingLevel,
} from "../../understanding/index.ts";
import {
  decisionOpportunity,
  noRisk,
  purposeContext,
  riskAssessment,
  traceabilityVerificationResult,
} from "../index.ts";
import type {
  CandidateSupport,
  DecisionOpportunity,
  ProhibitedIntentMarker,
  PurposeContext,
  RiskAssessment,
  SupportIntent,
  TraceabilityStatus,
  TraceabilityVerificationResult,
} from "../index.ts";

export const T = (iso: string): Timestamp => timestamp(iso);

const CEILING_LEVEL: Record<SafeVoiceCeiling, UnderstandingLevel> = {
  none: "Thin",
  tentative: "Working",
  qualified: "Trusted",
  confident: "Mature",
};

/** Build an UnderstandingAssessment literal at a chosen ceiling (decision-support consumes it). */
export function assessmentAt(ceiling: SafeVoiceCeiling): UnderstandingAssessment {
  return Object.freeze({
    dimension: understandingDimension("aerobic-response", "high-intensity"),
    level: CEILING_LEVEL[ceiling],
    fragility: fragility("low"),
    staleness: fresh(),
    safeVoiceCeiling: ceiling,
    reasons: Object.freeze([]),
    trace: Object.freeze([]),
  });
}

export function opportunity(): DecisionOpportunity {
  return decisionOpportunity({
    choice: "continue intensity vs recover",
    whySupportMayHelp: "fatigue trend is non-obvious",
    athleteRef: "athlete:1",
    at: T("2026-01-02T09:00:00.000Z"),
  });
}

export function declaredPurpose(): PurposeContext {
  return purposeContext("declared", "build aerobic base for a July race");
}

export function trace(status: TraceabilityStatus = "complete"): TraceabilityVerificationResult {
  if (status === "missing" || status === "invalid") {
    return traceabilityVerificationResult(status, `traceability ${status}`);
  }
  return traceabilityVerificationResult(status, `traceability ${status}`, {
    observationSetId: "set-1",
    observationIds: ["obs-1", "obs-2"],
  });
}

export function candidate(
  intent: SupportIntent = "reflect",
  markers: readonly ProhibitedIntentMarker[] = [],
  uncertaintyVisible = true,
): CandidateSupport {
  return Object.freeze({ intent, markers, uncertaintyVisible });
}

export function highRisk(): RiskAssessment {
  return riskAssessment("high", ["injury"]);
}

export function lowRisk(): RiskAssessment {
  return noRisk();
}

// Neutral cross-module adapters for Implementation 009 (test harness only; NOT a .test file).
//
// These live here -- not in `athlete` -- because converting an AthleteDecision into a
// SubjectiveObservation requires importing `observation`, and adapting an athlete-local decision
// ref into the decision-support ref requires `decision-support`. `athlete` must import neither
// (it is the upstream context). This harness is the seam: AthleteDecision RE-ENTERS as an
// Observation -- never as Signal, Evidence, or an Understanding update.

import type { AthleteDecision, AthleteDecisionRef as AthleteLocalDecisionRef } from "../athlete/index.ts";
import { subjectiveObservation } from "../observation/index.ts";
import type { SubjectiveObservation } from "../observation/index.ts";
import { athleteDecisionRef } from "../decision-support/index.ts";
import type { AthleteDecisionRef as SupportDecisionRef } from "../decision-support/index.ts";

/**
 * Represent a reported decision as a SubjectiveObservation for future reasoning. The decision id is
 * carried in provenance.reference; the choice + rationale become the athlete's verbatim words. The
 * result is an Observation -- detection/reasoning happen LATER through the existing modules.
 */
export function decisionAsObservation(decision: AthleteDecision): SubjectiveObservation {
  const rationale = decision.rationale.statements.join("; ");
  const words =
    rationale.length > 0
      ? `${decision.choice.action} -- because ${rationale}`
      : decision.choice.action;
  return subjectiveObservation({
    provenance: {
      source: "athlete-report",
      captureTime: decision.at,
      recordingTime: decision.at,
      reference: `athlete-decision:${String(decision.id)}`,
    },
    quality: {
      status: "complete",
      reason: decision.reportConfidence ?? "athlete-reported decision",
    },
    words,
    ...(decision.context.decisionSupportCaseRef !== undefined
      ? { inquiryRef: decision.context.decisionSupportCaseRef }
      : {}),
  });
}

/** Adapt an athlete-local decision ref to the decision-support AthleteDecisionRef (no athlete import of decision-support). */
export function toSupportDecisionRef(ref: AthleteLocalDecisionRef): SupportDecisionRef {
  return athleteDecisionRef(ref.decisionId, ref.at, ref.divergedFromSupport);
}

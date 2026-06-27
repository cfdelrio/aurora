// athlete domain: DecisionOutcomeRef — a handle to a LATER, SEPARATE outcome observation.
//
// The outcome is not the decision. This slice implements only the REFERENCE (not a full
// DecisionOutcome object): a decision may carry zero or more outcome refs recorded after the fact.
// The outcome never grades the support, and "no outcome" is a valid state (no refs).

import type { Timestamp } from "../../../shared-kernel/time.ts";

export interface DecisionOutcomeRef {
  /** opaque handle to a separate, later outcome observation */
  readonly outcomeObservationRef: string;
  readonly at: Timestamp;
}

export function decisionOutcomeRef(outcomeObservationRef: string, at: Timestamp): DecisionOutcomeRef {
  if (typeof outcomeObservationRef !== "string" || outcomeObservationRef.length === 0) {
    throw new Error("A DecisionOutcomeRef requires a non-empty outcome observation ref");
  }
  return Object.freeze({ outcomeObservationRef, at });
}

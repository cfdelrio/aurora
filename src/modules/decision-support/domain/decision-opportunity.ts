// decision-support domain: DecisionOpportunity — a non-obvious, consequential moment where
// support may be useful. Not created for every workout. Detection is out of scope (it is passed in).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { DecisionOpportunityId } from "./ids.ts";
import { newDecisionOpportunityId } from "./ids.ts";

export interface DecisionOpportunity {
  readonly id: DecisionOpportunityId;
  readonly choice: string;
  readonly whySupportMayHelp: string;
  readonly athleteRef: string;
  readonly at: Timestamp;
}

export interface DecisionOpportunityInput {
  readonly id?: DecisionOpportunityId;
  readonly choice: string;
  readonly whySupportMayHelp: string;
  readonly athleteRef: string;
  readonly at: Timestamp;
}

export function decisionOpportunity(input: DecisionOpportunityInput): DecisionOpportunity {
  if (typeof input.choice !== "string" || input.choice.length === 0) {
    throw new Error("DecisionOpportunity requires a non-empty choice");
  }
  if (typeof input.whySupportMayHelp !== "string" || input.whySupportMayHelp.length === 0) {
    throw new Error("DecisionOpportunity requires why support may help");
  }
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("DecisionOpportunity requires an athleteRef");
  }
  return Object.freeze({
    id: input.id ?? newDecisionOpportunityId(),
    choice: input.choice,
    whySupportMayHelp: input.whySupportMayHelp,
    athleteRef: input.athleteRef,
    at: input.at,
  });
}

// decision-support application: thin coordinators. They COORDINATE, they do not reason.
// All support-integrity invariants live in DecisionSupportCase; all voice selection in the policy.

import { DecisionSupportCase } from "../domain/index.ts";
import type { OpenCaseInput, AthleteDecisionRef } from "../domain/index.ts";

export function openDecisionSupportCase(input: OpenCaseInput): DecisionSupportCase {
  return DecisionSupportCase.open(input);
}

export interface EvaluateInput {
  readonly decisionCase: DecisionSupportCase;
}

export function evaluateDecisionSupportCase(input: EvaluateInput): DecisionSupportCase {
  return input.decisionCase.evaluate();
}

export interface RecordAthleteDecisionInput {
  readonly decisionCase: DecisionSupportCase;
  readonly ref: AthleteDecisionRef;
}

export function recordAthleteDecisionRef(input: RecordAthleteDecisionInput): DecisionSupportCase {
  return input.decisionCase.recordAthleteDecisionRef(input.ref);
}

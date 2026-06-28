// athlete domain: DecisionContext — where a decision sits, as REFERENCES only.
//
// It carries opaque string handles to the decision-support case / opportunity and the purpose
// version in force, plus any context limitations. References only -- it never imports or embeds a
// DecisionSupportCase (that would make athlete depend on decision-support).

export interface DecisionContext {
  /** opaque handle to the DecisionSupportCase this decision responded to, if any */
  readonly decisionSupportCaseRef?: string;
  /** opaque handle to the DecisionOpportunity, if known */
  readonly decisionOpportunityRef?: string;
  /** the PurposeVersionRef in force when the decision was made, for historical context */
  readonly purposeVersionRef?: string;
  /** what was missing/uncertain about the context, if reported */
  readonly limitations?: readonly string[];
}

export interface DecisionContextInput {
  readonly decisionSupportCaseRef?: string;
  readonly decisionOpportunityRef?: string;
  readonly purposeVersionRef?: string;
  readonly limitations?: readonly string[];
}

export function decisionContext(input: DecisionContextInput = {}): DecisionContext {
  return Object.freeze({
    ...(input.decisionSupportCaseRef !== undefined
      ? { decisionSupportCaseRef: input.decisionSupportCaseRef }
      : {}),
    ...(input.decisionOpportunityRef !== undefined
      ? { decisionOpportunityRef: input.decisionOpportunityRef }
      : {}),
    ...(input.purposeVersionRef !== undefined ? { purposeVersionRef: input.purposeVersionRef } : {}),
    ...(input.limitations !== undefined
      ? { limitations: Object.freeze([...input.limitations]) }
      : {}),
  });
}

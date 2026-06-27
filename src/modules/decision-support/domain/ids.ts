// decision-support domain: opaque identifiers (module-local for now).

declare const decisionOpportunityIdBrand: unique symbol;
declare const decisionSupportCaseIdBrand: unique symbol;

export type DecisionOpportunityId = string & { readonly [decisionOpportunityIdBrand]: true };
export type DecisionSupportCaseId = string & { readonly [decisionSupportCaseIdBrand]: true };

export function newDecisionOpportunityId(): DecisionOpportunityId {
  return crypto.randomUUID() as DecisionOpportunityId;
}

export function newDecisionSupportCaseId(): DecisionSupportCaseId {
  return crypto.randomUUID() as DecisionSupportCaseId;
}

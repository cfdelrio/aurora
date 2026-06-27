// decision-support application: the DecisionSupportCase repository PORT.
// Preserves and restores; never re-evaluates gates, never owns the athlete's decision.

import type { DecisionSupportCase } from "../domain/index.ts";
import type { DecisionSupportCaseId } from "../domain/index.ts";

export interface DecisionSupportCaseRepository {
  save(decisionCase: DecisionSupportCase): void;
  findById(id: DecisionSupportCaseId): DecisionSupportCase | undefined;
  exists(id: DecisionSupportCaseId): boolean;
}

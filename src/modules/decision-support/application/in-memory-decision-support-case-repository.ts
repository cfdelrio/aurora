// decision-support application: in-memory DecisionSupportCaseRepository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() (validated; evaluate() is NOT re-run).

import { DecisionSupportCase } from "../domain/index.ts";
import type { DecisionSupportCaseState, DecisionSupportCaseId } from "../domain/index.ts";
import type { DecisionSupportCaseRepository } from "./decision-support-case-repository.ts";

export class InMemoryDecisionSupportCaseRepository implements DecisionSupportCaseRepository {
  private readonly store = new Map<string, DecisionSupportCaseState>();

  save(decisionCase: DecisionSupportCase): void {
    this.store.set(String(decisionCase.id), structuredClone(decisionCase.toState()));
  }

  findById(id: DecisionSupportCaseId): DecisionSupportCase | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : DecisionSupportCase.reconstitute(structuredClone(state));
  }

  exists(id: DecisionSupportCaseId): boolean {
    return this.store.has(String(id));
  }

  clear(): void {
    this.store.clear();
  }
}

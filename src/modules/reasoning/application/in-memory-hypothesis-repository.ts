// reasoning application: in-memory HypothesisRepository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() so loads are independent and validated.

import { Hypothesis } from "../domain/index.ts";
import type { HypothesisState, HypothesisId } from "../domain/index.ts";
import type { HypothesisRepository } from "./hypothesis-repository.ts";

export class InMemoryHypothesisRepository implements HypothesisRepository {
  private readonly store = new Map<string, HypothesisState>();

  save(hypothesis: Hypothesis): void {
    this.store.set(String(hypothesis.id), structuredClone(hypothesis.toState()));
  }

  findById(id: HypothesisId): Hypothesis | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : Hypothesis.reconstitute(structuredClone(state));
  }

  exists(id: HypothesisId): boolean {
    return this.store.has(String(id));
  }

  clear(): void {
    this.store.clear();
  }
}

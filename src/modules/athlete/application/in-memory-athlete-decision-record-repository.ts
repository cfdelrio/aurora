// athlete application: in-memory AthleteDecisionRecordRepository adapter (module-local; NOT infra).
// Keyed by athleteRef. Stores deep-copied toState(); loads via reconstitute() (append-only preserved).

import { AthleteDecisionRecord } from "../domain/index.ts";
import type { AthleteDecisionRecordState } from "../domain/index.ts";
import type { AthleteDecisionRecordRepository } from "./athlete-decision-record-repository.ts";

export class InMemoryAthleteDecisionRecordRepository implements AthleteDecisionRecordRepository {
  private readonly store = new Map<string, AthleteDecisionRecordState>();

  save(record: AthleteDecisionRecord): void {
    this.store.set(record.athleteRef, structuredClone(record.toState()));
  }

  findByAthleteRef(athleteRef: string): AthleteDecisionRecord | undefined {
    const state = this.store.get(athleteRef);
    return state === undefined ? undefined : AthleteDecisionRecord.reconstitute(structuredClone(state));
  }

  exists(athleteRef: string): boolean {
    return this.store.has(athleteRef);
  }

  clear(): void {
    this.store.clear();
  }
}

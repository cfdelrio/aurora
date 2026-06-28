// athlete application: in-memory AthleteRepository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() (validated; append-only history preserved).

import { Athlete } from "../domain/index.ts";
import type { AthleteState, AthleteId } from "../domain/index.ts";
import type { AthleteRepository } from "./athlete-repository.ts";

export class InMemoryAthleteRepository implements AthleteRepository {
  private readonly store = new Map<string, AthleteState>();

  save(athlete: Athlete): void {
    this.store.set(String(athlete.id), structuredClone(athlete.toState()));
  }

  findById(id: AthleteId): Athlete | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : Athlete.reconstitute(structuredClone(state));
  }

  exists(id: AthleteId): boolean {
    return this.store.has(String(id));
  }

  clear(): void {
    this.store.clear();
  }
}

// understanding application: in-memory UnderstandingProfileRepository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() (validated; promotion is NOT re-run).

import { UnderstandingProfile } from "../domain/index.ts";
import type { UnderstandingProfileState, UnderstandingProfileId } from "../domain/index.ts";
import type { UnderstandingProfileRepository } from "./understanding-profile-repository.ts";

export class InMemoryUnderstandingProfileRepository implements UnderstandingProfileRepository {
  private readonly store = new Map<string, UnderstandingProfileState>();

  save(profile: UnderstandingProfile): void {
    this.store.set(String(profile.id), structuredClone(profile.toState()));
  }

  findById(id: UnderstandingProfileId): UnderstandingProfile | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : UnderstandingProfile.reconstitute(structuredClone(state));
  }

  exists(id: UnderstandingProfileId): boolean {
    return this.store.has(String(id));
  }

  clear(): void {
    this.store.clear();
  }
}

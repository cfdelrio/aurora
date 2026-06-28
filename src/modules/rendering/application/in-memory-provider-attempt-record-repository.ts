// rendering application: in-memory ProviderAttemptRecord repository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() (validated). Holds copies, never live references
// (mutation isolation). No database, no event append, no retry/scheduler/provider-call side effect.

import { ProviderAttemptRecord } from "../domain/index.ts";
import type { ProviderAttemptRecordId, ProviderAttemptRecordState } from "../domain/index.ts";
import type { ProviderAttemptRecordRepository } from "./provider-attempt-record-repository.ts";

export class InMemoryProviderAttemptRecordRepository implements ProviderAttemptRecordRepository {
  private readonly store = new Map<string, ProviderAttemptRecordState>();

  save(record: ProviderAttemptRecord): void {
    this.store.set(String(record.id), structuredClone(record.toState()));
  }

  findById(id: ProviderAttemptRecordId): ProviderAttemptRecord | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : ProviderAttemptRecord.reconstitute(structuredClone(state));
  }

  exists(id: ProviderAttemptRecordId): boolean {
    return this.store.has(String(id));
  }

  findByRenderableOutputRef(ref: string): readonly ProviderAttemptRecord[] {
    return Object.freeze(
      [...this.store.values()]
        .filter((state) => state.renderableOutputRef === ref)
        .map((state) => ProviderAttemptRecord.reconstitute(structuredClone(state))),
    );
  }

  findByProviderAdapterKind(kind: string): readonly ProviderAttemptRecord[] {
    return Object.freeze(
      [...this.store.values()]
        .filter((state) => state.providerAdapterKind === kind)
        .map((state) => ProviderAttemptRecord.reconstitute(structuredClone(state))),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

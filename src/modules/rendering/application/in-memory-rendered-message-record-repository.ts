// rendering application: in-memory RenderedMessageRecord repository adapter (module-local; NOT infra).
// Stores deep-copied toState(); loads via reconstitute() (validated). Holds copies, never live references
// (mutation isolation). No DB, no delivery side effect, no event append.

import { RenderedMessageRecord } from "../domain/index.ts";
import type { RenderedMessageRecordId, RenderedMessageRecordState } from "../domain/index.ts";
import type { RenderedMessageRecordRepository } from "./rendered-message-record-repository.ts";

export class InMemoryRenderedMessageRecordRepository implements RenderedMessageRecordRepository {
  private readonly store = new Map<string, RenderedMessageRecordState>();

  save(record: RenderedMessageRecord): void {
    this.store.set(String(record.id), structuredClone(record.toState()));
  }

  findById(id: RenderedMessageRecordId): RenderedMessageRecord | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : RenderedMessageRecord.reconstitute(structuredClone(state));
  }

  exists(id: RenderedMessageRecordId): boolean {
    return this.store.has(String(id));
  }

  findBySourceDomainOutputRef(ref: string): readonly RenderedMessageRecord[] {
    return Object.freeze(
      [...this.store.values()]
        .filter((state) => state.sourceDomainOutputRef === ref)
        .map((state) => RenderedMessageRecord.reconstitute(structuredClone(state))),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

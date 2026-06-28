// event-recording application: in-memory append-only adapter (module-local; NOT infrastructure).
// Stores deep-copied toState(); loads via reconstitute() (re-validated). Duplicate ids rejected.
// Holds copies, never live references. No update/delete; nothing is executed on append.

import { DomainEventRecord } from "../domain/index.ts";
import type { DomainEventRecordId, DomainEventRecordState, CorrelationRef } from "../domain/index.ts";
import type { DomainEventRecordRepository } from "./domain-event-record-repository.ts";

export class InMemoryDomainEventRecordRepository implements DomainEventRecordRepository {
  // Map preserves insertion (append) order.
  private readonly store = new Map<string, DomainEventRecordState>();

  append(record: DomainEventRecord): void {
    const key = String(record.id);
    if (this.store.has(key)) {
      throw new Error("DomainEventRecord ids are append-only and unique; duplicate rejected");
    }
    this.store.set(key, structuredClone(record.toState()));
  }

  findById(id: DomainEventRecordId): DomainEventRecord | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : DomainEventRecord.reconstitute(structuredClone(state));
  }

  all(): readonly DomainEventRecord[] {
    return Object.freeze(
      [...this.store.values()].map((state) => DomainEventRecord.reconstitute(structuredClone(state))),
    );
  }

  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[] {
    const target = String(ref);
    return Object.freeze(
      this.all().filter((r) => r.correlation !== undefined && String(r.correlation) === target),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

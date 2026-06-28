// delivery application: in-memory DeliveryRecord repository adapter (module-local; NOT infra). Stores
// deep-copied toState(); loads via reconstitute() (validated). Holds copies, never live references
// (mutation isolation). No DB, no event append, no retry/scheduler side effect.

import { DeliveryRecord } from "../domain/index.ts";
import type { DeliveryRecordId, DeliveryRecordState, RenderedMessageRecordId } from "../domain/index.ts";
import type { DeliveryRecordRepository } from "./delivery-record-repository.ts";

export class InMemoryDeliveryRecordRepository implements DeliveryRecordRepository {
  private readonly store = new Map<string, DeliveryRecordState>();

  save(record: DeliveryRecord): void {
    this.store.set(String(record.id), structuredClone(record.toState()));
  }

  findById(id: DeliveryRecordId): DeliveryRecord | undefined {
    const state = this.store.get(String(id));
    return state === undefined ? undefined : DeliveryRecord.reconstitute(structuredClone(state));
  }

  exists(id: DeliveryRecordId): boolean {
    return this.store.has(String(id));
  }

  findByRenderedMessageRecordRef(ref: RenderedMessageRecordId): readonly DeliveryRecord[] {
    return Object.freeze(
      [...this.store.values()]
        .filter((state) => state.renderedMessageRecordRef === ref)
        .map((state) => DeliveryRecord.reconstitute(structuredClone(state))),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

// delivery application: DeliveryRecordRepository port. Auditability for delivery attempts/outcomes.
// In-memory only — no database, no event append, no retry/scheduler side effect.

import type { DeliveryRecord, DeliveryRecordId, RenderedMessageRecordId } from "../domain/index.ts";

export interface DeliveryRecordRepository {
  save(record: DeliveryRecord): void;
  findById(id: DeliveryRecordId): DeliveryRecord | undefined;
  exists(id: DeliveryRecordId): boolean;
  findByRenderedMessageRecordRef(ref: RenderedMessageRecordId): readonly DeliveryRecord[];
}

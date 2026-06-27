// event-recording application: the append-only repository PORT for domain event records.
// There is no current state to overwrite, so there is no `save` — only `append`, plus reads.
// Forbidden by design: update, delete, replace, markProcessed, and any deliver/route/notify surface.

import type { DomainEventRecord, DomainEventRecordId } from "../domain/index.ts";
import type { CorrelationRef } from "../domain/index.ts";

export interface DomainEventRecordRepository {
  append(record: DomainEventRecord): void;
  findById(id: DomainEventRecordId): DomainEventRecord | undefined;
  all(): readonly DomainEventRecord[];
  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[];
}

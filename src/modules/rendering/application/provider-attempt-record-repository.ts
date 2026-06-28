// rendering application: ProviderAttemptRecordRepository port. Auditability for provider seam attempts.
// In-memory only — no database, no event append, no retry/scheduler/provider-call side effect.

import type { ProviderAttemptRecord, ProviderAttemptRecordId } from "../domain/index.ts";

export interface ProviderAttemptRecordRepository {
  save(record: ProviderAttemptRecord): void;
  findById(id: ProviderAttemptRecordId): ProviderAttemptRecord | undefined;
  exists(id: ProviderAttemptRecordId): boolean;
  findByRenderableOutputRef(ref: string): readonly ProviderAttemptRecord[];
  findByProviderAdapterKind(kind: string): readonly ProviderAttemptRecord[];
}

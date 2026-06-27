// rendering application: the RenderedMessageRecord repository PORT. It preserves and restores presentation
// records for auditability; it creates no meaning, mutates no domain, and appends no event. Minimal
// surface: save / findById / exists / findBySourceDomainOutputRef.

import type { RenderedMessageRecord } from "../domain/index.ts";
import type { RenderedMessageRecordId } from "../domain/index.ts";

export interface RenderedMessageRecordRepository {
  save(record: RenderedMessageRecord): void;
  findById(id: RenderedMessageRecordId): RenderedMessageRecord | undefined;
  exists(id: RenderedMessageRecordId): boolean;
  findBySourceDomainOutputRef(ref: string): readonly RenderedMessageRecord[];
}

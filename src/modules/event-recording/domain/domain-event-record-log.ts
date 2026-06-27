// event-recording domain: DomainEventRecordLog — an append-only collection of records.
// Immutable-by-operation (append returns a NEW log). No replace, no update, no delete: corrections
// and supersessions are NEW records. It executes nothing and dispatches nothing.

import { DomainEventRecord } from "./domain-event-record.ts";
import type { DomainEventRecordState } from "./domain-event-record.ts";
import type { DomainEventRecordId } from "./ids.ts";
import type { CorrelationRef } from "./correlation-ref.ts";

export interface DomainEventRecordLogState {
  readonly records: readonly DomainEventRecordState[];
}

export class DomainEventRecordLog {
  private readonly _records: readonly DomainEventRecord[];

  private constructor(records: readonly DomainEventRecord[]) {
    this._records = Object.freeze([...records]);
    Object.freeze(this);
  }

  static empty(): DomainEventRecordLog {
    return new DomainEventRecordLog([]);
  }

  /** Append a record, returning a new log. Duplicate ids are rejected (append-only, never reused). */
  append(record: DomainEventRecord): DomainEventRecordLog {
    if (this._records.some((r) => String(r.id) === String(record.id))) {
      throw new Error("DomainEventRecordLog is append-only: duplicate record id rejected");
    }
    return new DomainEventRecordLog([...this._records, record]);
  }

  findById(id: DomainEventRecordId): DomainEventRecord | undefined {
    return this._records.find((r) => String(r.id) === String(id));
  }

  /** All records, in append order. */
  all(): readonly DomainEventRecord[] {
    return this._records;
  }

  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[] {
    return this._records.filter((r) => r.correlation !== undefined && String(r.correlation) === String(ref));
  }

  toState(): DomainEventRecordLogState {
    return Object.freeze({ records: Object.freeze(this._records.map((r) => r.toState())) });
  }

  /** Re-validate every record and the append-only uniqueness of ids. No execution on rehydrate. */
  static reconstitute(state: DomainEventRecordLogState): DomainEventRecordLog {
    if (state === null || typeof state !== "object" || !Array.isArray(state.records)) {
      throw new Error("Cannot reconstitute a DomainEventRecordLog without a records array");
    }
    const records = state.records.map((s) => DomainEventRecord.reconstitute(s));
    const seen = new Set<string>();
    for (const r of records) {
      const key = String(r.id);
      if (seen.has(key)) {
        throw new Error("Cannot reconstitute a DomainEventRecordLog with duplicate record ids");
      }
      seen.add(key);
    }
    return new DomainEventRecordLog(records);
  }
}

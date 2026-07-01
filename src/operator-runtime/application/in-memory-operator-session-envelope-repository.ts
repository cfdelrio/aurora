// operator-runtime application: in-memory OperatorSessionEnvelopeRepository adapter.
// Deterministic, isolated per instance (no global / singleton state); holds and returns deep copies
// (structuredClone). No DB, no filesystem, no object storage.

import type {
  OperatorSessionEnvelopeRecord,
  OperatorSessionEnvelopeRecordId,
  OperatorSessionEnvelopeRepository,
} from "./operator-session-envelope-repository.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

export class InMemoryOperatorSessionEnvelopeRepository
  implements OperatorSessionEnvelopeRepository
{
  private readonly store = new Map<string, OperatorSessionEnvelopeRecord>();

  async save(record: OperatorSessionEnvelopeRecord): Promise<void> {
    this.store.set(String(record.id), structuredClone(record));
  }

  async findById(id: OperatorSessionEnvelopeRecordId): Promise<OperatorSessionEnvelopeRecord | undefined> {
    const found = this.store.get(String(id));
    return found === undefined ? undefined : structuredClone(found);
  }

  async findByRun(runId: OperatorSessionRunId): Promise<readonly OperatorSessionEnvelopeRecord[]> {
    const target = String(runId);
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => String(r.runId) === target)
        .map((r) => structuredClone(r)),
    );
  }

  async listByAthlete(athleteRef: string): Promise<readonly OperatorSessionEnvelopeRecord[]> {
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => r.athleteRef === athleteRef)
        .map((r) => structuredClone(r)),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

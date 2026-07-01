// operator-runtime application: in-memory OperatorSessionRunRepository adapter.
// Deterministic, isolated per instance (no global / singleton state); holds and returns deep copies
// (structuredClone). No DB, no filesystem, no object storage.

import type { TrainingSessionId } from "./training-session-record.ts";
import type {
  OperatorSessionRunId,
  OperatorSessionRunRecord,
  OperatorSessionRunRepository,
} from "./operator-session-run-repository.ts";

export class InMemoryOperatorSessionRunRepository implements OperatorSessionRunRepository {
  private readonly store = new Map<string, OperatorSessionRunRecord>();

  async save(record: OperatorSessionRunRecord): Promise<void> {
    this.store.set(String(record.id), structuredClone(record));
  }

  async findById(id: OperatorSessionRunId): Promise<OperatorSessionRunRecord | undefined> {
    const found = this.store.get(String(id));
    return found === undefined ? undefined : structuredClone(found);
  }

  async listByAthlete(athleteRef: string): Promise<readonly OperatorSessionRunRecord[]> {
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => r.athleteRef === athleteRef)
        .map((r) => structuredClone(r)),
    );
  }

  async listByTrainingSession(trainingSessionId: TrainingSessionId): Promise<readonly OperatorSessionRunRecord[]> {
    const target = String(trainingSessionId);
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => String(r.trainingSessionId) === target)
        .map((r) => structuredClone(r)),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

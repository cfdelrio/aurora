// operator-runtime application: in-memory TrainingSessionRepository adapter.
// Deterministic and isolated per instance (no global / singleton state). Holds deep copies
// (structuredClone) and returns deep copies — never live references — so callers cannot mutate the
// store. No DB, no filesystem, no object storage.

import type { TrainingSessionId, TrainingSessionRecord } from "./training-session-record.ts";
import type { TrainingSessionRepository } from "./training-session-repository.ts";

export class InMemoryTrainingSessionRepository implements TrainingSessionRepository {
  private readonly store = new Map<string, TrainingSessionRecord>();

  async save(record: TrainingSessionRecord): Promise<void> {
    this.store.set(String(record.id), structuredClone(record));
  }

  async findById(id: TrainingSessionId): Promise<TrainingSessionRecord | undefined> {
    const found = this.store.get(String(id));
    return found === undefined ? undefined : structuredClone(found);
  }

  async listByAthlete(athleteRef: string): Promise<readonly TrainingSessionRecord[]> {
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

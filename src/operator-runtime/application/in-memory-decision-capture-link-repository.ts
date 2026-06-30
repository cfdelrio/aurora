// operator-runtime application: in-memory DecisionCaptureLinkRepository adapter.
// Deterministic, isolated per instance (no global / singleton state); holds and returns deep copies
// (structuredClone). No DB, no filesystem, no object storage.

import type {
  DecisionCaptureLink,
  DecisionCaptureLinkId,
  DecisionCaptureLinkRepository,
} from "./decision-capture-link-repository.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

export class InMemoryDecisionCaptureLinkRepository implements DecisionCaptureLinkRepository {
  private readonly store = new Map<string, DecisionCaptureLink>();

  async save(record: DecisionCaptureLink): Promise<void> {
    this.store.set(String(record.id), structuredClone(record));
  }

  async findById(id: DecisionCaptureLinkId): Promise<DecisionCaptureLink | undefined> {
    const found = this.store.get(String(id));
    return found === undefined ? undefined : structuredClone(found);
  }

  async findByRun(runId: OperatorSessionRunId): Promise<readonly DecisionCaptureLink[]> {
    const target = String(runId);
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => String(r.runId) === target)
        .map((r) => structuredClone(r)),
    );
  }

  async listByAthlete(athleteRef: string): Promise<readonly DecisionCaptureLink[]> {
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

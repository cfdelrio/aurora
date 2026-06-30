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

  save(record: DecisionCaptureLink): void {
    this.store.set(String(record.id), structuredClone(record));
  }

  findById(id: DecisionCaptureLinkId): DecisionCaptureLink | undefined {
    const found = this.store.get(String(id));
    return found === undefined ? undefined : structuredClone(found);
  }

  findByRun(runId: OperatorSessionRunId): readonly DecisionCaptureLink[] {
    const target = String(runId);
    return Object.freeze(
      [...this.store.values()]
        .filter((r) => String(r.runId) === target)
        .map((r) => structuredClone(r)),
    );
  }

  listByAthlete(athleteRef: string): readonly DecisionCaptureLink[] {
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

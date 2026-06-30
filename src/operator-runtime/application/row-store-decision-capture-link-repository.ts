// operator-runtime application: a RowStoreClient-backed DecisionCaptureLinkRepository (043-D4A).
// Storage-backed, not DB-specific. The link stays an invitation/ref only (the row mapper + factory
// refuse anything else).
//   DecisionCaptureLink ≠ AthleteDecision · row-store repository ≠ the relational-client adapter.

import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import { OPERATOR_RUNTIME_TABLES } from "./operator-runtime-row-store.ts";
import { decisionCaptureLinkToRow, rowToDecisionCaptureLink } from "./operator-runtime-record-mappers.ts";
import type {
  DecisionCaptureLink,
  DecisionCaptureLinkId,
  DecisionCaptureLinkRepository,
} from "./decision-capture-link-repository.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

const TABLE = OPERATOR_RUNTIME_TABLES.decisionCaptureLink;

export class RowStoreDecisionCaptureLinkRepository implements DecisionCaptureLinkRepository {
  private readonly rows: RowStoreClient;

  constructor(rows: RowStoreClient) {
    this.rows = rows;
  }

  async save(record: DecisionCaptureLink): Promise<void> {
    await this.rows.insert(TABLE, decisionCaptureLinkToRow(record));
  }

  async findById(id: DecisionCaptureLinkId): Promise<DecisionCaptureLink | undefined> {
    const row = await this.rows.get(TABLE, String(id));
    return row === undefined ? undefined : rowToDecisionCaptureLink(row);
  }

  async findByRun(runId: OperatorSessionRunId): Promise<readonly DecisionCaptureLink[]> {
    const rows = await this.rows.findBy(TABLE, "run_id", String(runId));
    return Object.freeze(rows.map((r) => rowToDecisionCaptureLink(r)));
  }

  async listByAthlete(athleteRef: string): Promise<readonly DecisionCaptureLink[]> {
    const rows = await this.rows.findBy(TABLE, "athlete_ref", athleteRef);
    return Object.freeze(rows.map((r) => rowToDecisionCaptureLink(r)));
  }
}

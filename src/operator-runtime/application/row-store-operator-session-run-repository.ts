// operator-runtime application: a RowStoreClient-backed OperatorSessionRunRepository (043-D4A).
// Storage-backed, not DB-specific; wires the injected row-store + whitelist mappers.
//   row-store repository ≠ the relational-client adapter · run record ≠ delivery ≠ AthleteDecision.

import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import { OPERATOR_RUNTIME_TABLES } from "./operator-runtime-row-store.ts";
import { operatorSessionRunToRow, rowToOperatorSessionRun } from "./operator-runtime-record-mappers.ts";
import type { TrainingSessionId } from "./training-session-record.ts";
import type {
  OperatorSessionRunId,
  OperatorSessionRunRecord,
  OperatorSessionRunRepository,
} from "./operator-session-run-repository.ts";

const TABLE = OPERATOR_RUNTIME_TABLES.operatorSessionRun;

export class RowStoreOperatorSessionRunRepository implements OperatorSessionRunRepository {
  private readonly rows: RowStoreClient;

  constructor(rows: RowStoreClient) {
    this.rows = rows;
  }

  async save(record: OperatorSessionRunRecord): Promise<void> {
    await this.rows.insert(TABLE, operatorSessionRunToRow(record));
  }

  async findById(id: OperatorSessionRunId): Promise<OperatorSessionRunRecord | undefined> {
    const row = await this.rows.get(TABLE, String(id));
    return row === undefined ? undefined : rowToOperatorSessionRun(row);
  }

  async listByAthlete(athleteRef: string): Promise<readonly OperatorSessionRunRecord[]> {
    const rows = await this.rows.findBy(TABLE, "athlete_ref", athleteRef);
    return Object.freeze(rows.map((r) => rowToOperatorSessionRun(r)));
  }

  async listByTrainingSession(trainingSessionId: TrainingSessionId): Promise<readonly OperatorSessionRunRecord[]> {
    const rows = await this.rows.findBy(TABLE, "training_session_id", String(trainingSessionId));
    return Object.freeze(rows.map((r) => rowToOperatorSessionRun(r)));
  }
}

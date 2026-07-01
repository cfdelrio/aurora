// operator-runtime application: a RowStoreClient-backed OperatorSessionEnvelopeRepository (043-D4A).
// Storage-backed, not DB-specific. The whitelist row mapper (operatorSessionEnvelopeToRow) re-projects
// the envelope before storage, so no unsafe field can be persisted through this repository.
//   OperatorSessionEnvelopeRecord ≠ raw outcome · row-store repository ≠ the relational-client adapter.

import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import { OPERATOR_RUNTIME_TABLES } from "./operator-runtime-row-store.ts";
import { operatorSessionEnvelopeToRow, rowToOperatorSessionEnvelope } from "./operator-runtime-record-mappers.ts";
import type {
  OperatorSessionEnvelopeRecord,
  OperatorSessionEnvelopeRecordId,
  OperatorSessionEnvelopeRepository,
} from "./operator-session-envelope-repository.ts";
import type { OperatorSessionRunId } from "./operator-session-run-repository.ts";

const TABLE = OPERATOR_RUNTIME_TABLES.operatorSessionEnvelope;

export class RowStoreOperatorSessionEnvelopeRepository implements OperatorSessionEnvelopeRepository {
  private readonly rows: RowStoreClient;

  constructor(rows: RowStoreClient) {
    this.rows = rows;
  }

  async save(record: OperatorSessionEnvelopeRecord): Promise<void> {
    await this.rows.insert(TABLE, operatorSessionEnvelopeToRow(record));
  }

  async findById(id: OperatorSessionEnvelopeRecordId): Promise<OperatorSessionEnvelopeRecord | undefined> {
    const row = await this.rows.get(TABLE, String(id));
    return row === undefined ? undefined : rowToOperatorSessionEnvelope(row);
  }

  async findByRun(runId: OperatorSessionRunId): Promise<readonly OperatorSessionEnvelopeRecord[]> {
    const rows = await this.rows.findBy(TABLE, "run_id", String(runId));
    return Object.freeze(rows.map((r) => rowToOperatorSessionEnvelope(r)));
  }

  async listByAthlete(athleteRef: string): Promise<readonly OperatorSessionEnvelopeRecord[]> {
    const rows = await this.rows.findBy(TABLE, "athlete_ref", athleteRef);
    return Object.freeze(rows.map((r) => rowToOperatorSessionEnvelope(r)));
  }
}

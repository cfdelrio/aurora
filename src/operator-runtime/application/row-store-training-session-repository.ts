// operator-runtime application: a RowStoreClient-backed TrainingSessionRepository (Implementation 043-D4A).
//
// The bridge between the vendor-neutral RowStoreClient and the operator-runtime repository port: it wires
// the injected row-store + the existing whitelist row mappers, so runOperatorSession can run over any
// storage. It is storage-backed, NOT DB-specific — it imports no relational client and knows nothing
// about the underlying engine.
//
//   row-store repository ≠ the relational-client adapter · storage-backed repository ≠ Evidence ·
//   storage success ≠ understanding ≠ delivery · Aurora advises, the athlete decides.

import type { RowStoreClient } from "./operator-runtime-row-store.ts";
import { OPERATOR_RUNTIME_TABLES } from "./operator-runtime-row-store.ts";
import { trainingSessionToRow, rowToTrainingSession } from "./operator-runtime-record-mappers.ts";
import type { TrainingSessionId, TrainingSessionRecord } from "./training-session-record.ts";
import type { TrainingSessionRepository } from "./training-session-repository.ts";

const TABLE = OPERATOR_RUNTIME_TABLES.trainingSession;

export class RowStoreTrainingSessionRepository implements TrainingSessionRepository {
  private readonly rows: RowStoreClient;

  constructor(rows: RowStoreClient) {
    this.rows = rows;
  }

  async save(record: TrainingSessionRecord): Promise<void> {
    await this.rows.insert(TABLE, trainingSessionToRow(record));
  }

  async findById(id: TrainingSessionId): Promise<TrainingSessionRecord | undefined> {
    const row = await this.rows.get(TABLE, String(id));
    return row === undefined ? undefined : rowToTrainingSession(row);
  }

  async listByAthlete(athleteRef: string): Promise<readonly TrainingSessionRecord[]> {
    const rows = await this.rows.findBy(TABLE, "athlete_ref", athleteRef);
    return Object.freeze(rows.map((r) => rowToTrainingSession(r)));
  }
}

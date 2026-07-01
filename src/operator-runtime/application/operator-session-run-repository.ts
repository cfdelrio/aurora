// operator-runtime application: OperatorSessionRunRecord (+ factory) and its repository PORT.
//
// OPERATIONAL run metadata for one operator-mediated session: which training session it ran over, its
// run status, and a ref to the stored safe envelope. It is NOT delivery and NOT a decision:
//   OperatorSessionRunRecord ≠ delivery · OperatorSessionRunRecord ≠ AthleteDecision.
// It carries no delivery ids/artifacts, no AthleteDecision, and no raw runtime outcome — sessions run
// only behind invokeOperatorSession and the safe result is stored as an OperatorSessionEnvelopeRecord.
// Ids + timestamps are injected (no Date.now, no crypto here).

import type { Timestamp } from "../../shared-kernel/time.ts";
import type { TrainingSessionId } from "./training-session-record.ts";
import type { OperatorSessionEnvelopeRecordId } from "./operator-session-envelope-repository.ts";

declare const operatorSessionRunIdBrand: unique symbol;
export type OperatorSessionRunId = string & { readonly [operatorSessionRunIdBrand]: true };

export interface OperatorSessionRunRecord {
  readonly id: OperatorSessionRunId;
  readonly athleteRef: string;
  /** links the run to the TrainingSessionRecord it ran over */
  readonly trainingSessionId: TrainingSessionId;
  /** safe run status code (e.g. an OfflineReflectionStatus value) — a string, never raw content */
  readonly status: string;
  readonly startedAt: Timestamp;
  readonly completedAt?: Timestamp;
  /** ref to the stored safe envelope, once persisted — a ref, never the envelope itself */
  readonly envelopeRecordId?: OperatorSessionEnvelopeRecordId;
}

export interface OperatorSessionRunRecordInput {
  readonly id: OperatorSessionRunId;
  readonly athleteRef: string;
  readonly trainingSessionId: TrainingSessionId;
  readonly status: string;
  readonly startedAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly envelopeRecordId?: OperatorSessionEnvelopeRecordId;
}

export function operatorSessionRunRecord(
  input: OperatorSessionRunRecordInput,
): OperatorSessionRunRecord {
  if (input === null || typeof input !== "object") {
    throw new Error("OperatorSessionRunRecord requires id, athleteRef, trainingSessionId, status, startedAt");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("OperatorSessionRunRecord requires a non-empty id");
  }
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("OperatorSessionRunRecord requires a non-empty athleteRef");
  }
  if (typeof input.trainingSessionId !== "string" || input.trainingSessionId.length === 0) {
    throw new Error("OperatorSessionRunRecord requires a non-empty trainingSessionId");
  }
  if (typeof input.status !== "string" || input.status.length === 0) {
    throw new Error("OperatorSessionRunRecord requires a non-empty status code");
  }
  if (input.startedAt === undefined) {
    throw new Error("OperatorSessionRunRecord requires startedAt");
  }
  return Object.freeze({
    id: input.id,
    athleteRef: input.athleteRef,
    trainingSessionId: input.trainingSessionId,
    status: input.status,
    startedAt: input.startedAt,
    ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
    ...(input.envelopeRecordId !== undefined ? { envelopeRecordId: input.envelopeRecordId } : {}),
  });
}

export interface OperatorSessionRunRepository {
  save(record: OperatorSessionRunRecord): Promise<void>;
  findById(id: OperatorSessionRunId): Promise<OperatorSessionRunRecord | undefined>;
  listByAthlete(athleteRef: string): Promise<readonly OperatorSessionRunRecord[]>;
  listByTrainingSession(trainingSessionId: TrainingSessionId): Promise<readonly OperatorSessionRunRecord[]>;
}

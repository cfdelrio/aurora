// operator-runtime application: a VENDOR-NEUTRAL row-store CLIENT PORT (Implementation 043-D1).
//
// A zero-dependency abstraction a future concrete metadata adapter (D2) will sit behind. It models
// storage as named tables of flat, scalar rows keyed by an `id` column — NOT SQL, NOT a real DB client,
// NOT a deployment concern. It imports no database package, reads no process environment, and knows
// nothing about connections or vendors.
//
//   row-store contract ≠ real DB adapter · storage row ≠ Evidence · schema mapping ≠ a schema-change script ·
//   Aurora advises, the athlete decides; Aurora never presents inference as fact.

/** The only value types a vendor-neutral row column may hold. No nested objects, no raw payloads. */
export type StorageScalar = string | number | boolean | null;

/** A flat row: column → scalar. Every row carries a string `id` column. */
export interface StorageRow {
  readonly [column: string]: StorageScalar;
}

/**
 * Minimal vendor-neutral row-store client. A concrete adapter (D2) implements this over a real driver
 * behind a scoped one-file guard token-pin; the layer's records never depend on the driver, only on this.
 */
export interface RowStoreClient {
  insert(table: string, row: StorageRow): void;
  get(table: string, id: string): StorageRow | undefined;
  list(table: string): readonly StorageRow[];
  findBy(table: string, column: string, value: StorageScalar): readonly StorageRow[];
}

/** The conceptual table names (Tech Spec 043D §4 Decision 4 — conceptual schema; no SQL here). */
export const OPERATOR_RUNTIME_TABLES = {
  trainingSession: "training_session",
  operatorSessionRun: "operator_session_run",
  operatorSessionEnvelope: "operator_session_envelope",
  decisionCaptureLink: "decision_capture_link",
} as const;

export type OperatorRuntimeTable =
  (typeof OPERATOR_RUNTIME_TABLES)[keyof typeof OPERATOR_RUNTIME_TABLES];

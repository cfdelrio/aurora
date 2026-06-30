// operator-runtime application: the Postgres-compatible RowStoreClient adapter (Implementation 043-D2-R).
//
// This is the ONE approved file permitted to reference the `pg` client (scoped one-file guard token-pin,
// approval-tied to 043-D2-R). It implements the ASYNC RowStoreClient over an INJECTED queryable; it
// creates no connection from the environment, reads no process environment, resolves no secret, and owns
// no deployment. Configuration (a Pool/Client/queryable) is injected by the caller; the deployment
// executable (a later slice) is what builds and injects it.
//
//   Postgres adapter ≠ persistence truth · DB row ≠ Evidence/ObservationSet/Signal/AthleteDecision ·
//   schema-change file ≠ deployment · adapter config ≠ secret resolution · Postgres row-store ≠ object storage ·
//   row persistence success ≠ understanding ≠ delivery · Aurora advises, the athlete decides.
//
// Redaction is already owned by the record factories + mappers (whitelist); this adapter stores the
// scalar StorageRow it is handed VERBATIM as jsonb and never spreads or derives anything. All writes and
// reads are PARAMETERIZED — no row value is ever concatenated into SQL text.

import { Pool, type PoolConfig } from "pg";

import type {
  RowStoreClient,
  StorageRow,
  StorageScalar,
} from "./operator-runtime-row-store.ts";
import { OPERATOR_RUNTIME_TABLES } from "./operator-runtime-row-store.ts";

/** The narrow query surface the adapter needs — satisfied by a pg Pool/Client (injected). */
export interface PostgresQueryable {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: readonly Record<string, unknown>[] }>;
}

/** The single physical table backing the vendor-neutral row store (see schema/001-operator-runtime-row.sql). */
export const OPERATOR_RUNTIME_ROW_TABLE = "operator_runtime_row";

const KNOWN_TABLES: ReadonlySet<string> = new Set(Object.values(OPERATOR_RUNTIME_TABLES));

function assertKnownTable(table: string): void {
  if (!KNOWN_TABLES.has(table)) {
    throw new Error(`unknown operator-runtime table: ${table}`);
  }
}

function asStorageRow(value: unknown): StorageRow {
  if (value === null || typeof value !== "object") {
    throw new Error("row_data must be a stored row object");
  }
  return value as StorageRow;
}

/**
 * A Postgres-compatible RowStoreClient. Rows live as opaque jsonb in a single table keyed by
 * (table_name, id); the logical D1 table is a parameter, never an SQL identifier, so there is no
 * identifier injection surface. All values are passed as query parameters.
 */
export class PostgresRowStoreClient implements RowStoreClient {
  private readonly queryable: PostgresQueryable;

  constructor(queryable: PostgresQueryable) {
    this.queryable = queryable;
  }

  async insert(table: string, row: StorageRow): Promise<void> {
    assertKnownTable(table);
    const id = row["id"];
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("RowStoreClient.insert requires a non-empty string 'id' column");
    }
    await this.queryable.query(
      `INSERT INTO ${OPERATOR_RUNTIME_ROW_TABLE} (table_name, id, row_data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (table_name, id) DO UPDATE SET row_data = EXCLUDED.row_data`,
      [table, id, JSON.stringify(row)],
    );
  }

  async get(table: string, id: string): Promise<StorageRow | undefined> {
    assertKnownTable(table);
    const result = await this.queryable.query(
      `SELECT row_data FROM ${OPERATOR_RUNTIME_ROW_TABLE} WHERE table_name = $1 AND id = $2`,
      [table, id],
    );
    const first = result.rows[0];
    return first === undefined ? undefined : asStorageRow(first["row_data"]);
  }

  async list(table: string): Promise<readonly StorageRow[]> {
    assertKnownTable(table);
    const result = await this.queryable.query(
      `SELECT row_data FROM ${OPERATOR_RUNTIME_ROW_TABLE} WHERE table_name = $1`,
      [table],
    );
    return Object.freeze(result.rows.map((r) => asStorageRow(r["row_data"])));
  }

  async findBy(table: string, column: string, value: StorageScalar): Promise<readonly StorageRow[]> {
    assertKnownTable(table);
    if (value === null) {
      const result = await this.queryable.query(
        `SELECT row_data FROM ${OPERATOR_RUNTIME_ROW_TABLE} WHERE table_name = $1 AND row_data ->> $2 IS NULL`,
        [table, column],
      );
      return Object.freeze(result.rows.map((r) => asStorageRow(r["row_data"])));
    }
    const result = await this.queryable.query(
      `SELECT row_data FROM ${OPERATOR_RUNTIME_ROW_TABLE} WHERE table_name = $1 AND row_data ->> $2 = $3`,
      [table, column, String(value)],
    );
    return Object.freeze(result.rows.map((r) => asStorageRow(r["row_data"])));
  }
}

/**
 * Build a queryable from an explicit, injected config (a pg Pool). This is the genuine runtime use of
 * `pg`. It reads NO process environment — the caller (the deployment executable, a later slice) supplies
 * the config. Provided so the dependency is real; tests inject a fake queryable instead.
 */
export function createPostgresQueryable(config: PoolConfig): PostgresQueryable {
  const pool = new Pool(config);
  return {
    query: (text, values) => pool.query(text, values === undefined ? undefined : [...values]),
  };
}

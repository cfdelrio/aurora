// operator-runtime application: the FAKE in-memory RowStoreClient (Implementation 043-D1).
//
// A deterministic, isolated-per-instance test double for the vendor-neutral row-store — NOT a real DB,
// NOT integration infrastructure. It holds and returns deep copies (structuredClone), uses no global
// state, no network, no filesystem, and no environment access.
//
//   fake client ≠ integration test · fake row-store ≠ real DB adapter.

import type {
  RowStoreClient,
  StorageRow,
  StorageScalar,
} from "./operator-runtime-row-store.ts";

export class FakeRowStoreClient implements RowStoreClient {
  // table -> (id -> row); insertion order preserved per table
  private readonly tables = new Map<string, Map<string, StorageRow>>();

  insert(table: string, row: StorageRow): void {
    const id = row["id"];
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("RowStoreClient.insert requires a non-empty string 'id' column");
    }
    let rows = this.tables.get(table);
    if (rows === undefined) {
      rows = new Map<string, StorageRow>();
      this.tables.set(table, rows);
    }
    rows.set(id, structuredClone(row));
  }

  get(table: string, id: string): StorageRow | undefined {
    const found = this.tables.get(table)?.get(id);
    return found === undefined ? undefined : structuredClone(found);
  }

  list(table: string): readonly StorageRow[] {
    const rows = this.tables.get(table);
    return rows === undefined ? Object.freeze([]) : Object.freeze([...rows.values()].map((r) => structuredClone(r)));
  }

  findBy(table: string, column: string, value: StorageScalar): readonly StorageRow[] {
    return Object.freeze(this.list(table).filter((r) => r[column] === value));
  }

  clear(): void {
    this.tables.clear();
  }
}

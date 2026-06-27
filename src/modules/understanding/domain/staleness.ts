// understanding domain: Staleness — how current the understanding is. Stale pushes toward caution
// (lowers the safe voice ceiling); it never deletes history.

import type { Timestamp } from "../../../shared-kernel/time.ts";

export type StalenessStatus = "fresh" | "stale";

export interface Staleness {
  readonly status: StalenessStatus;
  readonly reason?: string;
  readonly since?: Timestamp;
}

export function fresh(): Staleness {
  return Object.freeze({ status: "fresh" });
}

export function stale(reason: string, since: Timestamp): Staleness {
  if (typeof reason !== "string" || reason.length === 0) {
    throw new Error("Stale understanding requires an explicit reason");
  }
  return Object.freeze({ status: "stale", reason, since });
}

// understanding domain: RefreshTrigger — a domain occurrence that MAY require refresh or staleness
// marking. A trigger never mutates source history; it is traceable and SELECTIVE (it carries the
// scope it concerns), and it never implies a global reset by default.

import type { Timestamp } from "../../../shared-kernel/time.ts";

export type RefreshTriggerKind =
  | "purpose-change"
  | "hypothesis-revised"
  | "hypothesis-falsified"
  | "observation-superseded"
  | "source-quality-changed"
  | "new-contradictory-evidence"
  | "time-decay"
  | "context-changed"
  | "missing-source"
  | "projection-source-unavailable";

/** The scope a trigger concerns. Absent fields mean "scope unspecified for that axis". */
export interface RefreshTriggerScope {
  readonly dimensionKey?: string;
  readonly hypothesisId?: string;
  readonly observationId?: string;
  readonly observationSetId?: string;
  readonly purposeVersionRef?: string;
}

export interface RefreshTrigger {
  readonly kind: RefreshTriggerKind;
  readonly at: Timestamp;
  readonly scope?: RefreshTriggerScope;
  readonly note?: string;
}

export interface RefreshTriggerInput {
  readonly kind: RefreshTriggerKind;
  readonly at: Timestamp;
  readonly scope?: RefreshTriggerScope;
  readonly note?: string;
}

export function refreshTrigger(input: RefreshTriggerInput): RefreshTrigger {
  const base = { kind: input.kind, at: input.at };
  return Object.freeze({
    ...base,
    ...(input.scope !== undefined ? { scope: Object.freeze({ ...input.scope }) } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  });
}

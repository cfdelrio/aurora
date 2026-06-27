// understanding domain: UnderstandingChange — one recorded change. Append-only; never deleted.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";

export type UnderstandingChangeReason =
  | "initial"
  | "survived-challenge"
  | "contradiction"
  | "falsification"
  | "surprise"
  | "staleness"
  | "purpose-change"
  | "constraint-change"
  | "context-shift";

export interface UnderstandingChange {
  readonly from: UnderstandingLevel;
  readonly to: UnderstandingLevel;
  readonly reason: UnderstandingChangeReason;
  readonly trace?: TraceToHypothesisOutcome;
  readonly at: Timestamp;
  readonly note?: string;
}

export interface UnderstandingChangeInput {
  readonly from: UnderstandingLevel;
  readonly to: UnderstandingLevel;
  readonly reason: UnderstandingChangeReason;
  readonly trace?: TraceToHypothesisOutcome;
  readonly at: Timestamp;
  readonly note?: string;
}

export function understandingChange(input: UnderstandingChangeInput): UnderstandingChange {
  const change: UnderstandingChange = {
    from: input.from,
    to: input.to,
    reason: input.reason,
    at: input.at,
    ...(input.trace !== undefined ? { trace: input.trace } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  return Object.freeze(change);
}

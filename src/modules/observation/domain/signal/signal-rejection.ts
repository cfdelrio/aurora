// signal sub-boundary: the SignalRejection value object.
//
// Rejection is a first-class, auditable outcome — never silent deletion. The original
// observation remains preserved (reachable via trace); a reason is required.

import type { ObservationQuality } from "../observation-quality.ts";
import type { ContextualFrame } from "./contextual-frame.ts";
import type { TraceToObservation } from "./contextualized-observation.ts";

export type SignalRejectionReason =
  | "insufficient-quality"
  | "insufficient-context"
  | "expected-normal-variation"
  | "source-conflict-unresolved"
  | "duplicate-redundant"
  | "irrelevant-to-current-question"
  | "missing-baseline"
  | "missing-purpose"
  | "noise"
  | "stale-context";

export interface SignalRejection {
  readonly outcome: "rejection";
  readonly trace: TraceToObservation;
  readonly frame: ContextualFrame;
  readonly reason: SignalRejectionReason;
  readonly quality: ObservationQuality;
  readonly note?: string;
}

export interface SignalRejectionInput {
  readonly trace: TraceToObservation;
  readonly frame: ContextualFrame;
  readonly reason: SignalRejectionReason;
  readonly quality: ObservationQuality;
  readonly note?: string;
}

export function signalRejection(input: SignalRejectionInput): SignalRejection {
  if (input.trace === undefined) {
    throw new Error("A SignalRejection must remain traceable to its observation(s)");
  }
  if (input.reason === undefined) {
    throw new Error("A SignalRejection requires an explicit reason");
  }
  const base = {
    outcome: "rejection" as const,
    trace: input.trace,
    frame: input.frame,
    reason: input.reason,
    quality: input.quality,
  };
  return Object.freeze(input.note === undefined ? base : { ...base, note: input.note });
}

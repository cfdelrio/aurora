// understanding domain: Surprise — a material inconsistency with current understanding.
// First-class and recorded; never hidden.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";

export type SurpriseKind = "positive" | "negative" | "ambiguous" | "noise" | "context-shift";

export interface Surprise {
  readonly kind: SurpriseKind;
  readonly description: string;
  readonly trace: TraceToHypothesisOutcome;
  readonly at: Timestamp;
}

export interface SurpriseInput {
  readonly kind: SurpriseKind;
  readonly description: string;
  readonly trace: TraceToHypothesisOutcome;
  readonly at: Timestamp;
}

export function surprise(input: SurpriseInput): Surprise {
  if (typeof input.description !== "string" || input.description.length === 0) {
    throw new Error("Surprise requires a non-empty description");
  }
  return Object.freeze({
    kind: input.kind,
    description: input.description,
    trace: input.trace,
    at: input.at,
  });
}

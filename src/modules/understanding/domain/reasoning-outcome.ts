// understanding domain: ReasoningOutcome — the anti-corruption shape understanding consumes.
//
// It is derived (by the application-layer adapter) FROM a reasoning Hypothesis snapshot, but it
// deliberately carries NO ClaimConfidence and NO raw EvidenceCase/Signal. This makes
// "claim confidence -> understanding level" unrepresentable and keeps understanding consuming
// OUTCOMES, not raw evidence. Only the HypothesisId TYPE is imported from reasoning.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { HypothesisId } from "../../reasoning/index.ts";
import type { UnderstandingDimension } from "./understanding-dimension.ts";

export type OutcomeKind =
  | "supported"
  | "weakened"
  | "contradicted"
  | "falsified"
  | "retired"
  | "promoted-to-working-knowledge";

export interface TraceToHypothesisOutcome {
  readonly hypothesisId: HypothesisId;
  readonly outcomeKind: OutcomeKind;
  readonly at: Timestamp;
}

export function traceToHypothesisOutcome(
  hypothesisId: HypothesisId,
  outcomeKind: OutcomeKind,
  at: Timestamp,
): TraceToHypothesisOutcome {
  return Object.freeze({ hypothesisId, outcomeKind, at });
}

export interface ReasoningOutcome {
  readonly hypothesisId: HypothesisId;
  readonly athleteRef: string;
  readonly outcomeKind: OutcomeKind;
  readonly hadDeclaredFalsifier: boolean;
  readonly conditions: readonly string[];
  readonly dimension: UnderstandingDimension;
  readonly at: Timestamp;
  // NOTE: deliberately NO claimConfidence field.
}

export interface ReasoningOutcomeInput {
  readonly hypothesisId: HypothesisId;
  readonly athleteRef: string;
  readonly outcomeKind: OutcomeKind;
  readonly hadDeclaredFalsifier: boolean;
  readonly conditions: readonly string[];
  readonly dimension: UnderstandingDimension;
  readonly at: Timestamp;
}

export function reasoningOutcome(input: ReasoningOutcomeInput): ReasoningOutcome {
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("ReasoningOutcome requires an athlete-specific athleteRef");
  }
  return Object.freeze({
    hypothesisId: input.hypothesisId,
    athleteRef: input.athleteRef,
    outcomeKind: input.outcomeKind,
    hadDeclaredFalsifier: input.hadDeclaredFalsifier,
    conditions: Object.freeze([...input.conditions]),
    dimension: input.dimension,
    at: input.at,
  });
}

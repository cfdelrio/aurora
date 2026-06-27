// understanding application: the anti-corruption adapter.
// Builds a ReasoningOutcome FROM a reasoning Hypothesis snapshot, deliberately dropping raw
// EvidenceCases/Signals AND ClaimConfidence. Only TYPES are imported from reasoning (no runtime
// dependency), so "understanding may depend on reasoning" holds without coupling internals.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Hypothesis, HypothesisLifecycleState } from "../../reasoning/index.ts";
import { reasoningOutcome } from "../domain/index.ts";
import type { OutcomeKind, ReasoningOutcome, UnderstandingDimension } from "../domain/index.ts";

function toOutcomeKind(state: HypothesisLifecycleState): OutcomeKind {
  switch (state) {
    case "supported":
    case "weakened":
    case "contradicted":
    case "falsified":
    case "retired":
    case "promoted-to-working-knowledge":
      return state;
    default:
      throw new Error(
        `Hypothesis state '${state}' is not a settled outcome understanding can consume`,
      );
  }
}

export interface ReasoningOutcomeFromInput {
  readonly hypothesis: Hypothesis;
  readonly dimension: UnderstandingDimension;
  /** the relevant conditions for this outcome, supplied by the caller (not dug out of evidence) */
  readonly conditions: readonly string[];
  readonly at: Timestamp;
}

export function reasoningOutcomeFrom(input: ReasoningOutcomeFromInput): ReasoningOutcome {
  const { hypothesis } = input;
  if (hypothesis.athleteRef === undefined) {
    throw new Error(
      "Understanding requires an athlete-specific hypothesis (athleteRef); population claims do not update understanding",
    );
  }
  return reasoningOutcome({
    hypothesisId: hypothesis.id,
    athleteRef: hypothesis.athleteRef,
    outcomeKind: toOutcomeKind(hypothesis.state),
    hadDeclaredFalsifier: hypothesis.falsifiers.some((f) => f.status === "declared"),
    conditions: input.conditions,
    dimension: input.dimension,
    at: input.at,
    // ClaimConfidence and EvidenceCases are intentionally NOT read here.
  });
}

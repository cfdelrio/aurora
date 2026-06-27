// observation application: a coordinator that detects signals over an ObservationSet.
// It COORDINATES, it does not reason. It supplies no context of its own (the caller provides
// the frame per observation); it runs the policy and returns EVERY outcome — signals AND
// rejections — so nothing is silently dropped.

import type { ObservationSet } from "../domain/index.ts";
import type { Observation } from "../domain/index.ts";
import { contextualize, expectedRangeDeviationPolicy } from "../domain/signal/index.ts";
import type {
  ContextualFrame,
  Signal,
  SignalDetectionPolicy,
  SignalRejection,
} from "../domain/signal/index.ts";

export interface DetectSignalsInput {
  readonly set: ObservationSet;
  /** the caller supplies the contextual frame per observation; the coordinator invents none */
  readonly frameFor: (observation: Observation) => ContextualFrame;
  readonly policy?: SignalDetectionPolicy;
}

export function detectSignals(input: DetectSignalsInput): readonly (Signal | SignalRejection)[] {
  const policy = input.policy ?? expectedRangeDeviationPolicy;
  // Only active observations are evaluated; supersession history is read, never altered.
  return input.set.active().map((observation) =>
    policy(
      contextualize({
        observation,
        observationSetId: input.set.id,
        frame: input.frameFor(observation),
      }),
    ),
  );
}

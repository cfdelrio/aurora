// signal sub-boundary: TraceToObservation (the bottom link) and ContextualizedObservation.
//
// TraceToObservation is the BOTTOM LINK ONLY back to the originating ObservationSet/Observation.
// It is NOT the full TraceabilityChain (which the future decision-support module owns).
//
// ContextualizedObservation pairs a (frozen) Observation with a ContextualFrame. It is frame,
// not conclusion: it carries no relevance, direction, or meaning. It never mutates the original.

import type { ObservationId, ObservationSetId } from "../../../../shared-kernel/ids.ts";
import type { Observation } from "../observation.ts";
import type { ObservationQuality } from "../observation-quality.ts";
import type { ContextualFrame } from "./contextual-frame.ts";

export interface TraceToObservation {
  readonly observationSetId: ObservationSetId;
  readonly observationIds: readonly ObservationId[];
  readonly references: readonly string[];
}

export function traceToObservation(
  observationSetId: ObservationSetId,
  observations: readonly Observation[],
): TraceToObservation {
  if (observations.length === 0) {
    throw new Error("TraceToObservation requires at least one observation");
  }
  return Object.freeze({
    observationSetId,
    observationIds: Object.freeze(observations.map((o) => o.id)),
    references: Object.freeze(observations.map((o) => o.provenance.reference)),
  });
}

export interface ContextualizedObservation {
  readonly observation: Observation;
  readonly frame: ContextualFrame;
  readonly quality: ObservationQuality;
  readonly trace: TraceToObservation;
}

export interface ContextualizeInput {
  readonly observation: Observation;
  readonly observationSetId: ObservationSetId;
  readonly frame: ContextualFrame;
}

export function contextualize(input: ContextualizeInput): ContextualizedObservation {
  const { observation, observationSetId, frame } = input;
  // The observation is frozen (Implementation 001) and only referenced here — never mutated.
  return Object.freeze({
    observation,
    frame,
    quality: observation.quality,
    trace: traceToObservation(observationSetId, [observation]),
  });
}

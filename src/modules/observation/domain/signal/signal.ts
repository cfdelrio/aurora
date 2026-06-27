// signal sub-boundary: the Signal value object.
//
// A Signal asserts only that a contextualized observation MAY BE RELEVANT to a future
// reasoning question. It carries relevance, direction-relative-to-context, salience, quality,
// source, traceability, and uncertainty — and NOTHING ELSE.
//
// NEGATIVE CAPABILITY: a Signal has no field for fatigue, readiness, capacity, cause, impact,
// evidence, recommendation, or athlete state. Those are unrepresentable here, not merely untested.

import type { ObservationQuality } from "../observation-quality.ts";
import type { Source } from "../../../../shared-kernel/provenance.ts";
import type { ContextualFrame } from "./contextual-frame.ts";
import type { TraceToObservation } from "./contextualized-observation.ts";

/** Direction relative to context — never causal, never impact. */
export type SignalDirection = "above-expected" | "below-expected" | "deviates" | "absent";

/** Qualitative salience — how much it stands out. No numeric score. */
export type SignalSalience = "weak" | "notable" | "strong";

export interface Signal {
  readonly outcome: "signal";
  readonly trace: TraceToObservation;
  readonly frame: ContextualFrame;
  /** a future reasoning question CATEGORY, never an answer */
  readonly questionTopic: string;
  readonly direction: SignalDirection;
  readonly salience: SignalSalience;
  readonly quality: ObservationQuality;
  readonly source: readonly Source[];
  readonly limitation?: string;
}

export interface SignalInput {
  readonly trace: TraceToObservation;
  readonly frame: ContextualFrame;
  readonly questionTopic: string;
  readonly direction: SignalDirection;
  readonly salience: SignalSalience;
  readonly quality: ObservationQuality;
  readonly source: readonly Source[];
  readonly limitation?: string;
}

export function signal(input: SignalInput): Signal {
  if (input.trace === undefined) {
    throw new Error("A Signal must be traceable to its observation(s)");
  }
  if (typeof input.questionTopic !== "string" || input.questionTopic.length === 0) {
    throw new Error("A Signal must name a question topic (a category, not an answer)");
  }
  if (input.quality === undefined) {
    throw new Error("A Signal must carry the observation's quality");
  }
  if (input.source.length === 0) {
    throw new Error("A Signal must carry at least one source");
  }
  const base = {
    outcome: "signal" as const,
    trace: input.trace,
    frame: input.frame,
    questionTopic: input.questionTopic,
    direction: input.direction,
    salience: input.salience,
    quality: input.quality,
    source: Object.freeze([...input.source]),
  };
  return Object.freeze(
    input.limitation === undefined ? base : { ...base, limitation: input.limitation },
  );
}

// signal sub-boundary — PUBLIC SURFACE.
// Exports ONLY contextualization + detection operations and their types.
// No hypothesis, evidence, impact, understanding, decision, scoring, or inference symbol.

export { contextualFrame } from "./contextual-frame.ts";
export type { ContextualFrame, ContextualFrameInput, ExpectedRange } from "./contextual-frame.ts";

export { contextualize, traceToObservation } from "./contextualized-observation.ts";
export type {
  ContextualizedObservation,
  ContextualizeInput,
  TraceToObservation,
} from "./contextualized-observation.ts";

export { signal } from "./signal.ts";
export type { Signal, SignalInput, SignalDirection, SignalSalience } from "./signal.ts";

export { signalRejection } from "./signal-rejection.ts";
export type { SignalRejection, SignalRejectionInput, SignalRejectionReason } from "./signal-rejection.ts";

export { expectedRangeDeviationPolicy } from "./signal-detection-policy.ts";
export type { SignalDetectionPolicy } from "./signal-detection-policy.ts";

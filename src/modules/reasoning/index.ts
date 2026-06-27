// reasoning module — PUBLIC SURFACE.
// Turns Signals into EvidenceCases inside falsifiable, revisable Hypotheses. It consumes the
// observation Signal surface (read-only); it never imports understanding or decision-support, and
// observation never imports it. It produces no understanding, decision, recommendation, or voice.

export * from "./domain/index.ts";
export {
  openHypothesis,
  attachSignalAsEvidence,
  transitionHypothesis,
} from "./application/reasoning-coordinator.ts";
export type {
  AttachSignalAsEvidenceInput,
  TransitionHypothesisInput,
} from "./application/reasoning-coordinator.ts";

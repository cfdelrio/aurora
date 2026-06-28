// understanding module — PUBLIC SURFACE.
// Updates dimension-specific UnderstandingProfile from reasoning lifecycle outcomes and exposes a
// read-only UnderstandingAssessment (with a SafeVoiceCeiling that is NOT a VoiceMode). It consumes
// reasoning outcomes (read-only); it never imports decision-support, and reasoning never imports it.
// It produces no decision, recommendation, warning, inquiry, or voice.

export * from "./domain/index.ts";
export { reasoningOutcomeFrom } from "./application/reasoning-outcome-adapter.ts";
export type { ReasoningOutcomeFromInput } from "./application/reasoning-outcome-adapter.ts";
export {
  updateUnderstandingFromOutcome,
  produceUnderstandingAssessment,
  markUnderstandingStale,
} from "./application/understanding-coordinator.ts";
export type {
  UpdateFromOutcomeInput,
  ProduceAssessmentInput,
  MarkStaleInput,
} from "./application/understanding-coordinator.ts";
export type { UnderstandingProfileRepository } from "./application/understanding-profile-repository.ts";
export { InMemoryUnderstandingProfileRepository } from "./application/in-memory-understanding-profile-repository.ts";

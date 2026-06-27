// understanding application: thin coordinators. They COORDINATE, they do not reason.
// All promotion/demotion/staleness invariants live in UnderstandingProfile + the pure policy.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import { UnderstandingProfile } from "../domain/index.ts";
import type {
  ReasoningOutcome,
  StaleReason,
  UnderstandingAssessment,
} from "../domain/index.ts";

export interface UpdateFromOutcomeInput {
  readonly profile: UnderstandingProfile;
  readonly outcome: ReasoningOutcome;
}

export function updateUnderstandingFromOutcome(input: UpdateFromOutcomeInput): UnderstandingProfile {
  return input.profile.updateFromOutcome(input.outcome);
}

export interface ProduceAssessmentInput {
  readonly profile: UnderstandingProfile;
  readonly dimensionKey: string;
  /** when this assessment is derived; populates the projection's derived-at (optional) */
  readonly at?: Timestamp;
}

export function produceUnderstandingAssessment(
  input: ProduceAssessmentInput,
): UnderstandingAssessment | undefined {
  return input.profile.assess(input.dimensionKey, input.at);
}

export interface MarkStaleInput {
  readonly profile: UnderstandingProfile;
  readonly dimensionKey: string;
  readonly reason: StaleReason;
  readonly at: Timestamp;
}

export function markUnderstandingStale(input: MarkStaleInput): UnderstandingProfile {
  return input.profile.markStale(input.dimensionKey, input.reason, input.at);
}

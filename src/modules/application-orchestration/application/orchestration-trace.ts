// application-orchestration: the ref-only trace of an explicit composition run. It records WHICH artifacts
// were produced (by safe id) and WHERE the run stopped — never raw content. There is no draft, prompt,
// payload, provider response, credential, secret, env value, chain-of-thought, message body, or arbitrary
// metadata bag here; every field is a string id, a closed enum, or a safe status/failure code.

/** Closed catalog of the stages an orchestration run can reach. Past-tense / occurrence-oriented. */
export type OrchestrationStage =
  | "rendering-requested"
  | "provider-rendering-completed"
  | "provider-attempt-audited"
  | "rendered-message-recorded"
  | "review-recorded"
  | "display-eligibility-derived"
  | "delivery-requested"
  | "delivery-completed"
  | "occurrence-event-recorded"
  | "stopped";

export const ORCHESTRATION_STAGES: readonly OrchestrationStage[] = [
  "rendering-requested",
  "provider-rendering-completed",
  "provider-attempt-audited",
  "rendered-message-recorded",
  "review-recorded",
  "display-eligibility-derived",
  "delivery-requested",
  "delivery-completed",
  "occurrence-event-recorded",
  "stopped",
];

/** Ref-only trace. Ids are carried as plain strings (String(brandedId)); no branded import leaks, no raw
 *  content is representable. `reasonCode` is always a closed code (ProviderFailure / RenderingFailure /
 *  DeliveryOutcome / review status / an orchestration-internal safe code), never free text from a draft. */
export interface OrchestrationTrace {
  readonly stoppedAt: OrchestrationStage;
  readonly providerAttemptRecordId?: string;
  readonly renderedMessageRecordId?: string;
  readonly renderReviewId?: string;
  readonly displayEligibility?: "eligible" | "ineligible";
  readonly deliveryRequestId?: string;
  readonly deliveryRecordId?: string;
  readonly eventRecordIds?: readonly string[];
  readonly reasonCode?: string;
}

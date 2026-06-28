// event-recording application: public surface.

export type { DomainEventRecordRepository } from "./domain-event-record-repository.ts";
export { InMemoryDomainEventRecordRepository } from "./in-memory-domain-event-record-repository.ts";

// Output-out occurrence event factories (Impl 024) — pure, ref-only; return records, persist nothing.
export {
  providerAttemptRecordedEvent,
  providerDraftValidationFailedEvent,
  providerDraftValidationPassedEvent,
  renderedMessageRecordedEvent,
  renderReviewRecordedEvent,
  displayEligibilityDerivedEvent,
  deliveryRequestRecordedEvent,
  deliveryOutcomeRecordedEvent,
} from "./provider-rendering-delivery-events.ts";
export type {
  OccurrenceTiming,
  ProviderAttemptRecordedInput,
  ProviderDraftValidationFailedInput,
  ProviderDraftValidationPassedInput,
  RenderedMessageRecordedInput,
  RenderReviewRecordedInput,
  DisplayEligibilityDerivedInput,
  DeliveryRequestRecordedInput,
  DeliveryOutcomeRecordedInput,
} from "./provider-rendering-delivery-events.ts";

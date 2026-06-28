// event-recording application: PURE factories for output-out occurrence events (Impl 024). Each returns a
// ref-only DomainEventRecord built via the existing DomainEventRecord.record(...) — it persists NOTHING, calls no
// provider / transport / validator / renderer / delivery sink, and imports NO rendering/delivery/provider module
// (artifacts are referenced by kind+id strings only, so event-recording stays dependency-neutral). Recording is
// explicit application composition: nothing here is recorded automatically by a core operation. Payloads are ref-only — no
// raw draft/prompt/payload/provider-response/secret/env value/chain-of-thought/metadata bag is representable.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import { DomainEventRecord, eventPayloadRef, newDomainEventRecordId } from "../domain/index.ts";
import type {
  DomainEventRecordId,
  DomainEventType,
  DomainEventCategory,
  ProducingModule,
  EventPayloadRef,
  TraceabilityEnvelope,
} from "../domain/index.ts";

/** Common timing + optional deterministic id for an occurrence record. */
export interface OccurrenceTiming {
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly id?: DomainEventRecordId;
}

function build(
  type: DomainEventType,
  category: DomainEventCategory,
  producingModule: ProducingModule,
  traceability: TraceabilityEnvelope,
  timing: OccurrenceTiming,
): DomainEventRecord {
  return DomainEventRecord.record({
    id: timing.id ?? newDomainEventRecordId(),
    type,
    category,
    occurredAt: timing.occurredAt,
    recordedAt: timing.recordedAt,
    producingModule,
    traceability,
  });
}

const ref = (kind: EventPayloadRef["kind"], id: string, role?: string): EventPayloadRef =>
  eventPayloadRef(role !== undefined ? { kind, id, role } : { kind, id });

// --- provider (produced by `rendering`) ----------------------------------------------------------

export interface ProviderAttemptRecordedInput extends OccurrenceTiming {
  readonly providerAttemptRecordId: string;
}
/** A provider attempt happened. Primary = the raw-free ProviderAttemptRecord; no draft/prompt/payload/secret. */
export function providerAttemptRecordedEvent(input: ProviderAttemptRecordedInput): DomainEventRecord {
  return build("ProviderAttemptRecorded", "occurrence", "rendering",
    { primaryArtifactRef: ref("ProviderAttemptRecord", input.providerAttemptRecordId), sourceRefs: [] }, input);
}

export interface ProviderDraftValidationFailedInput extends OccurrenceTiming {
  readonly providerAttemptRecordId: string;
  /** a safe failure REASON CODE (e.g. a RenderingFailure/ProviderFailure member) — never raw draft text */
  readonly failureReason?: string;
}
/** A provider draft was refused by validateDraft. No rendered-message record is created; not a domain failure. */
export function providerDraftValidationFailedEvent(input: ProviderDraftValidationFailedInput): DomainEventRecord {
  return build("ProviderDraftValidationFailed", "outcome", "rendering",
    { primaryArtifactRef: ref("ProviderAttemptRecord", input.providerAttemptRecordId, input.failureReason), sourceRefs: [] }, input);
}

export interface ProviderDraftValidationPassedInput extends OccurrenceTiming {
  readonly providerAttemptRecordId: string;
  /** only if a RenderedMessageRecord already exists for this validated draft */
  readonly renderedMessageRecordId?: string;
}
/** A provider draft passed validateDraft. Not evidence, not recommendation quality. */
export function providerDraftValidationPassedEvent(input: ProviderDraftValidationPassedInput): DomainEventRecord {
  const sourceRefs: EventPayloadRef[] =
    input.renderedMessageRecordId !== undefined ? [ref("RenderedMessageRecord", input.renderedMessageRecordId, "validated")] : [];
  return build("ProviderDraftValidationPassed", "outcome", "rendering",
    { primaryArtifactRef: ref("ProviderAttemptRecord", input.providerAttemptRecordId), sourceRefs }, input);
}

// --- rendering (record / review / display) --------------------------------------------------------

export interface RenderedMessageRecordedInput extends OccurrenceTiming {
  readonly renderedMessageRecordId: string;
}
/** A validated rendered message was persisted as a presentation artifact. No raw unvalidated draft. */
export function renderedMessageRecordedEvent(input: RenderedMessageRecordedInput): DomainEventRecord {
  return build("RenderedMessageRecorded", "occurrence", "rendering",
    { primaryArtifactRef: ref("RenderedMessageRecord", input.renderedMessageRecordId), sourceRefs: [] }, input);
}

export interface RenderReviewRecordedInput extends OccurrenceTiming {
  readonly renderReviewId: string;
  readonly renderedMessageRecordId: string;
  /** a safe review decision/reason CODE (never raw text) */
  readonly decision?: string;
}
/** A display-safety review decision was made. Triggers no display/delivery. */
export function renderReviewRecordedEvent(input: RenderReviewRecordedInput): DomainEventRecord {
  return build("RenderReviewRecorded", "outcome", "rendering",
    {
      primaryArtifactRef: ref("RenderReview", input.renderReviewId, input.decision),
      sourceRefs: [ref("RenderedMessageRecord", input.renderedMessageRecordId)],
    }, input);
}

export interface DisplayEligibilityDerivedInput extends OccurrenceTiming {
  readonly renderedMessageRecordId: string;
  readonly eligible: boolean;
}
/** Display eligibility was derived (no id'd artifact — carried as the record ref's role). Triggers no delivery. */
export function displayEligibilityDerivedEvent(input: DisplayEligibilityDerivedInput): DomainEventRecord {
  const role = input.eligible ? "display-eligible" : "display-ineligible";
  return build("DisplayEligibilityDerived", "occurrence", "rendering",
    { primaryArtifactRef: ref("RenderedMessageRecord", input.renderedMessageRecordId, role), sourceRefs: [] }, input);
}

// --- delivery (exposure) --------------------------------------------------------------------------

export interface DeliveryRequestRecordedInput extends OccurrenceTiming {
  readonly deliveryRequestId: string;
  readonly renderedMessageRecordId: string;
  /** a safe target summary (e.g. the closed DeliveryTarget value) — never a raw body */
  readonly targetSummary?: string;
}
/** A delivery was requested for a display-eligible record. Calls no delivery sink. */
export function deliveryRequestRecordedEvent(input: DeliveryRequestRecordedInput): DomainEventRecord {
  return build("DeliveryRequestRecorded", "occurrence", "delivery",
    {
      primaryArtifactRef: ref("DeliveryRequest", input.deliveryRequestId, input.targetSummary),
      sourceRefs: [ref("RenderedMessageRecord", input.renderedMessageRecordId)],
    }, input);
}

export interface DeliveryOutcomeRecordedInput extends OccurrenceTiming {
  readonly deliveryRecordId: string;
  readonly deliveryRequestId: string;
  /** a safe outcome/failure REASON CODE — never a raw body; implies no athlete reception/decision */
  readonly outcome?: string;
}
/** A delivery outcome occurred (exposure audit). No auto-retry; implies no athlete reception/decision. */
export function deliveryOutcomeRecordedEvent(input: DeliveryOutcomeRecordedInput): DomainEventRecord {
  return build("DeliveryOutcomeRecorded", "outcome", "delivery",
    {
      primaryArtifactRef: ref("DeliveryRecord", input.deliveryRecordId, input.outcome),
      sourceRefs: [ref("DeliveryRequest", input.deliveryRequestId)],
    }, input);
}

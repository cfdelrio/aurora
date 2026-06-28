// application-orchestration: the explicit input to a composition run. It carries the authoritative
// RenderingRequest (the renderable + safe constraints), injected timestamps and optional deterministic ids,
// and OPTIONAL review/delivery inputs whose PRESENCE selects those steps (partial composition is first-class).
// It must NOT carry a raw credential, a process-env value, a provider prompt/payload, chain-of-thought,
// hidden reasoning, or an arbitrary metadata bag — none of those is representable here.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type {
  RenderingRequest,
  ProviderAttemptRecordId,
  RenderedMessageRecordId,
  RenderReviewId,
  RenderReviewDecision,
  RenderReviewReason,
  ReviewerKind,
} from "../../rendering/index.ts";
import type { DeliveryTarget, RequesterKind, DeliveryRequestId, DeliveryRecordId } from "../../delivery/index.ts";

/** Injected timestamps — no Date.now() inside orchestration; tests pass fixed values for determinism. */
export interface OrchestrationTiming {
  readonly occurredAt: Timestamp; // when the underlying occurrence happened (for events)
  readonly recordedAt: Timestamp; // when it is recorded (for events)
  readonly requestedAt: Timestamp; // provider/delivery request time (for audit + delivery request)
  readonly completedAt: Timestamp; // provider completion time (for audit)
  readonly createdAt: Timestamp; // record/audit creation time
  readonly now: Timestamp; // delivery sink time + review time
}

/** Optional deterministic ids. Each defaults to a freshly generated id when omitted. */
export interface OrchestrationIds {
  readonly providerAttemptRecordId?: ProviderAttemptRecordId;
  readonly renderedMessageRecordId?: RenderedMessageRecordId;
  readonly renderReviewId?: RenderReviewId;
  readonly deliveryRequestId?: DeliveryRequestId;
  readonly deliveryRecordId?: DeliveryRecordId;
}

/** Present ⇒ the review step runs (append an explicit review before deriving display eligibility). */
export interface OrchestrationReviewInput {
  readonly decision: RenderReviewDecision; // must be an appendable decision (renderReview rejects derived-only)
  readonly reasons: readonly RenderReviewReason[];
  readonly reviewerKind: ReviewerKind;
  readonly notes?: string; // a single explicit safe note; never a payload bag
}

/** Present (with a deliverySink + deliveryRecordRepository in deps) ⇒ the delivery step runs. */
export interface OrchestrationDeliveryInput {
  readonly target: DeliveryTarget;
  readonly requesterKind: RequesterKind;
  readonly reason?: string; // a single explicit safe note; never a payload bag
}

export interface ExplicitOrchestrationCommand {
  readonly request: RenderingRequest; // authoritative renderable + safe constraints
  readonly timing: OrchestrationTiming;
  readonly ids?: OrchestrationIds;
  readonly review?: OrchestrationReviewInput;
  readonly delivery?: OrchestrationDeliveryInput;
  /** explicit opt-in to the occurrence-event step (requires deps.eventRepository). */
  readonly recordEvents?: boolean;
}

// application-orchestration: orchestrateRenderDeliver — the ONE explicit composition surface. It calls the
// EXISTING services (requestRealProviderRendering → auditProviderAttempt → RenderedMessageRecord.from* + save
// → appendReview + save → displayEligibilityOf → requestDelivery → the Impl 024 event factories + append) in a
// fixed order, EACH step an explicit call. It coordinates boundaries; it does not dissolve them. There is no
// event bus, no scheduler, no retry, no queue, no workflow engine, and no hidden side effect: no event or
// repository write triggers the next step (this function's control flow does). It owns no domain model, no
// repository, and no persistence of its own — every side-effecting collaborator is injected. Provider success
// is not evidence; delivery success is not an athlete decision; display eligibility is necessary but NOT
// sufficient for delivery; validateDraft (inside requestRealProviderRendering) stays the only path to a
// RenderedMessage; failures are safe stops or a safe partial result, never an automatic retry. The result and
// trace carry SAFE REFS ONLY — no raw draft/prompt/payload/provider-response/secret/env value/message body.

import {
  requestRealProviderRendering,
  auditProviderAttempt,
  RenderedMessageRecord,
  renderReview,
  displayEligibilityOf,
  newProviderAttemptRecordId,
  newRenderedMessageRecordId,
  newRenderReviewId,
} from "../../rendering/index.ts";
import {
  deliveryRequest,
  requestDelivery,
  newDeliveryRequestId,
  newDeliveryRecordId,
} from "../../delivery/index.ts";
import {
  providerAttemptRecordedEvent,
  providerDraftValidationFailedEvent,
  providerDraftValidationPassedEvent,
  renderedMessageRecordedEvent,
  renderReviewRecordedEvent,
  displayEligibilityDerivedEvent,
  deliveryRequestRecordedEvent,
  deliveryOutcomeRecordedEvent,
} from "../../event-recording/index.ts";
import type { DomainEventRecord } from "../../event-recording/index.ts";

import type { ExplicitOrchestrationCommand } from "./orchestration-command.ts";
import type { ExplicitOrchestrationDependencies } from "./orchestration-dependencies.ts";
import type { OrchestrationOutcome, OrchestrationOutcomeKind } from "./orchestration-result.ts";
import type { OrchestrationStage, OrchestrationTrace } from "./orchestration-trace.ts";

// A mutable, internal accumulator. Fields are `T | undefined` (not optional) so they can be assigned as the
// run progresses; buildTrace() projects it to the readonly, exactOptional OrchestrationTrace via conditional
// spreads (no `undefined` is ever written onto an optional field).
interface MutableTrace {
  stoppedAt: OrchestrationStage;
  providerAttemptRecordId: string | undefined;
  renderedMessageRecordId: string | undefined;
  renderReviewId: string | undefined;
  displayEligibility: "eligible" | "ineligible" | undefined;
  deliveryRequestId: string | undefined;
  deliveryRecordId: string | undefined;
  eventRecordIds: readonly string[] | undefined;
  reasonCode: string | undefined;
}

function freshTrace(): MutableTrace {
  return {
    stoppedAt: "rendering-requested",
    providerAttemptRecordId: undefined,
    renderedMessageRecordId: undefined,
    renderReviewId: undefined,
    displayEligibility: undefined,
    deliveryRequestId: undefined,
    deliveryRecordId: undefined,
    eventRecordIds: undefined,
    reasonCode: undefined,
  };
}

function buildTrace(t: MutableTrace): OrchestrationTrace {
  return Object.freeze({
    stoppedAt: t.stoppedAt,
    ...(t.providerAttemptRecordId !== undefined ? { providerAttemptRecordId: t.providerAttemptRecordId } : {}),
    ...(t.renderedMessageRecordId !== undefined ? { renderedMessageRecordId: t.renderedMessageRecordId } : {}),
    ...(t.renderReviewId !== undefined ? { renderReviewId: t.renderReviewId } : {}),
    ...(t.displayEligibility !== undefined ? { displayEligibility: t.displayEligibility } : {}),
    ...(t.deliveryRequestId !== undefined ? { deliveryRequestId: t.deliveryRequestId } : {}),
    ...(t.deliveryRecordId !== undefined ? { deliveryRecordId: t.deliveryRecordId } : {}),
    ...(t.eventRecordIds !== undefined ? { eventRecordIds: Object.freeze([...t.eventRecordIds]) } : {}),
    ...(t.reasonCode !== undefined ? { reasonCode: t.reasonCode } : {}),
  });
}

/** A required-persistence failure: safe stop, no event step. */
function stop(kind: OrchestrationOutcomeKind, t: MutableTrace, reasonCode: string): OrchestrationOutcome {
  t.reasonCode = reasonCode;
  t.stoppedAt = "stopped";
  return { kind, trace: buildTrace(t) };
}

interface FinalizeContext {
  readonly rendered: boolean;
  readonly deliveryOutcome?: string;
}

/**
 * Step 9 (explicit, ref-only) + return. If the event step is selected (command.recordEvents === true AND
 * deps.eventRepository present), record an occurrence event for each completed step — AFTER the steps, by
 * calling a PURE Impl 024 factory then `eventRepository.append`. An event-factory/append failure does NOT
 * retry, mutate, or invalidate the completed domain steps: it returns `partial-success` (Decision 8).
 * Events NEVER trigger steps; this is the terminal action.
 */
function finalize(
  kind: OrchestrationOutcomeKind,
  t: MutableTrace,
  ctx: FinalizeContext,
  command: ExplicitOrchestrationCommand,
  deps: ExplicitOrchestrationDependencies,
): OrchestrationOutcome {
  const repo = deps.eventRepository;
  if (command.recordEvents !== true || repo === undefined) {
    return { kind, trace: buildTrace(t) };
  }
  const ts = { occurredAt: command.timing.occurredAt, recordedAt: command.timing.recordedAt } as const;
  try {
    const eventIds: string[] = [];
    const append = (rec: DomainEventRecord): void => {
      repo.append(rec);
      eventIds.push(String(rec.id));
    };

    const attemptId = t.providerAttemptRecordId;
    if (attemptId !== undefined) {
      append(providerAttemptRecordedEvent({ providerAttemptRecordId: attemptId, ...ts }));
      if (ctx.rendered) {
        append(
          providerDraftValidationPassedEvent({
            providerAttemptRecordId: attemptId,
            ...(t.renderedMessageRecordId !== undefined ? { renderedMessageRecordId: t.renderedMessageRecordId } : {}),
            ...ts,
          }),
        );
      } else {
        append(
          providerDraftValidationFailedEvent({
            providerAttemptRecordId: attemptId,
            ...(t.reasonCode !== undefined ? { failureReason: t.reasonCode } : {}),
            ...ts,
          }),
        );
      }
    }

    const recordId = t.renderedMessageRecordId;
    if (recordId !== undefined) {
      append(renderedMessageRecordedEvent({ renderedMessageRecordId: recordId, ...ts }));
      if (t.renderReviewId !== undefined) {
        append(
          renderReviewRecordedEvent({
            renderReviewId: t.renderReviewId,
            renderedMessageRecordId: recordId,
            ...(command.review !== undefined ? { decision: command.review.decision } : {}),
            ...ts,
          }),
        );
      }
      if (t.displayEligibility !== undefined) {
        append(
          displayEligibilityDerivedEvent({
            renderedMessageRecordId: recordId,
            eligible: t.displayEligibility === "eligible",
            ...ts,
          }),
        );
      }
      if (t.deliveryRequestId !== undefined) {
        append(
          deliveryRequestRecordedEvent({
            deliveryRequestId: t.deliveryRequestId,
            renderedMessageRecordId: recordId,
            ...(command.delivery !== undefined ? { targetSummary: command.delivery.target } : {}),
            ...ts,
          }),
        );
      }
    }

    if (t.deliveryRecordId !== undefined && t.deliveryRequestId !== undefined) {
      append(
        deliveryOutcomeRecordedEvent({
          deliveryRecordId: t.deliveryRecordId,
          deliveryRequestId: t.deliveryRequestId,
          ...(ctx.deliveryOutcome !== undefined ? { outcome: ctx.deliveryOutcome } : {}),
          ...ts,
        }),
      );
    }

    t.eventRecordIds = eventIds;
    t.stoppedAt = "occurrence-event-recorded";
    return { kind, trace: buildTrace(t) };
  } catch {
    // Non-invalidating: the domain steps stand; only the occurrence-event recording failed.
    t.reasonCode = "event-recording-failed";
    return { kind: "partial-success", trace: buildTrace(t) };
  }
}

/** The single explicit composition surface. Async because it composes requestRealProviderRendering. */
export async function orchestrateRenderDeliver(
  command: ExplicitOrchestrationCommand,
  deps: ExplicitOrchestrationDependencies,
): Promise<OrchestrationOutcome> {
  const { timing } = command;
  const ids = command.ids ?? {};
  const t = freshTrace();

  // 1. Provider rendering (fail-closed INSIDE: credential fast-path + the unchanged validateDraft).
  const outcome = await requestRealProviderRendering({
    request: command.request,
    client: deps.client,
    config: deps.config,
    secret: deps.secret,
  });
  t.stoppedAt = "provider-rendering-completed";

  // 2. Provider-attempt audit — only if selected (deps.providerAttemptRepository present). Observes BOTH
  //    rendered and failed outcomes; raw-free. A failure here is a safe stop BEFORE delivery.
  if (deps.providerAttemptRepository !== undefined) {
    try {
      const attempt = auditProviderAttempt({
        request: command.request,
        outcome,
        providerAdapterKind: deps.providerAdapterKind,
        requestedAt: timing.requestedAt,
        completedAt: timing.completedAt,
        createdAt: timing.createdAt,
        id: ids.providerAttemptRecordId ?? newProviderAttemptRecordId(),
      });
      deps.providerAttemptRepository.save(attempt);
      t.providerAttemptRecordId = String(attempt.id);
      t.stoppedAt = "provider-attempt-audited";
    } catch {
      return stop("recording-failed", t, "provider-attempt-audit-failed");
    }
  }

  // 3. Stop if the provider did not render — NO record/review/delivery (fail-closed).
  if (outcome.status !== "rendered") {
    t.reasonCode = outcome.failure;
    return finalize("provider-not-rendered", t, { rendered: false }, command, deps);
  }

  // 4. Create + persist the rendered-message record (explicit).
  let record: RenderedMessageRecord;
  try {
    record = RenderedMessageRecord.fromRenderedMessage({
      id: ids.renderedMessageRecordId ?? newRenderedMessageRecordId(),
      message: outcome.message,
      rendererKind: deps.rendererKind,
      createdAt: timing.createdAt,
    });
    deps.renderedMessageRecordRepository.save(record);
    t.renderedMessageRecordId = String(record.id);
    t.stoppedAt = "rendered-message-recorded";
  } catch {
    return stop("recording-failed", t, "rendered-message-record-failed");
  }

  // 5. Review — only if selected. Reviews live on the record (appendReview → new record → save).
  if (command.review !== undefined) {
    try {
      const review = renderReview({
        id: ids.renderReviewId ?? newRenderReviewId(),
        recordRef: record.id,
        decision: command.review.decision,
        reasons: command.review.reasons,
        reviewedAt: timing.now,
        reviewerKind: command.review.reviewerKind,
        ...(command.review.notes !== undefined ? { notes: command.review.notes } : {}),
      });
      record = record.appendReview(review);
      deps.renderedMessageRecordRepository.save(record);
      t.renderReviewId = String(review.id);
      t.stoppedAt = "review-recorded";
    } catch {
      return stop("recording-failed", t, "render-review-failed");
    }
  }

  // 6. Derive display eligibility (explicit, DERIVED — never asserted).
  const eligibility = displayEligibilityOf(record);
  t.displayEligibility = eligibility.eligible ? "eligible" : "ineligible";
  t.stoppedAt = "display-eligibility-derived";

  // 7. Stop if ineligible — NO delivery.
  if (!eligibility.eligible) {
    const kind: OrchestrationOutcomeKind =
      eligibility.currentReviewStatus === "rejected-for-display" ? "review-rejected" : "display-ineligible";
    t.reasonCode = eligibility.currentReviewStatus;
    return finalize(kind, t, { rendered: true }, command, deps);
  }

  // 8. Delivery — only if selected AND eligible. Eligibility is necessary, NOT sufficient; requestDelivery
  //    self-persists the DeliveryRecord through the injected repository. Delivery failure does NOT retry.
  if (
    command.delivery !== undefined &&
    deps.deliverySink !== undefined &&
    deps.deliveryRecordRepository !== undefined
  ) {
    const request = deliveryRequest({
      id: ids.deliveryRequestId ?? newDeliveryRequestId(),
      renderedMessageRecordRef: record.id,
      target: command.delivery.target,
      requestedAt: timing.requestedAt,
      requesterKind: command.delivery.requesterKind,
      ...(command.delivery.reason !== undefined ? { reason: command.delivery.reason } : {}),
    });
    t.deliveryRequestId = String(request.id);
    t.stoppedAt = "delivery-requested";
    const deliveryRecord = requestDelivery({
      request,
      renderedMessageRecord: record,
      sink: deps.deliverySink,
      now: timing.now,
      deliveryRecordRepository: deps.deliveryRecordRepository,
      recordId: ids.deliveryRecordId ?? newDeliveryRecordId(),
    });
    t.deliveryRecordId = String(deliveryRecord.id);
    t.stoppedAt = "delivery-completed";
    if (deliveryRecord.outcome === "delivered") {
      return finalize("delivered", t, { rendered: true, deliveryOutcome: deliveryRecord.outcome }, command, deps);
    }
    t.reasonCode = deliveryRecord.outcome;
    return finalize("delivery-failed", t, { rendered: true, deliveryOutcome: deliveryRecord.outcome }, command, deps);
  }

  // No delivery selected → terminal `rendered` (partial composition).
  return finalize("rendered", t, { rendered: true }, command, deps);
}

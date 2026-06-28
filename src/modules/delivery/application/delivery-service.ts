// delivery application: requestDelivery — the single, synchronous, deterministic exposure entry point.
// It VERIFIES eligibility via rendering's displayEligibilityOf(record) (no parallel rules), calls a
// deterministic test sink ONLY when eligible + the target is supported, and persists an auditable
// DeliveryRecord. It mutates no rendered record, mutates no upstream domain, appends no event, and
// triggers no retry/reprojection/reasoning. This is the only delivery file that imports rendering.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import { displayEligibilityOf } from "../../rendering/index.ts";
import type { RenderedMessageRecord } from "../../rendering/index.ts";
import {
  DeliveryRecord,
  deliveryEligibilityCheck,
  isSupportedTarget,
  newDeliveryRecordId,
  primaryFailureReasonFor,
} from "../domain/index.ts";
import type {
  DeliveryEligibilityCheck,
  DeliveryRecordId,
  DeliveryRequest,
  DeliverySink,
} from "../domain/index.ts";
import type { DeliveryRecordRepository } from "./delivery-record-repository.ts";

export interface RequestDeliveryInput {
  readonly request: DeliveryRequest;
  /** the rendered-message record, resolved by the caller from rendering; undefined ⇒ not found */
  readonly renderedMessageRecord: RenderedMessageRecord | undefined;
  readonly sink: DeliverySink;
  readonly now: Timestamp;
  readonly deliveryRecordRepository: DeliveryRecordRepository;
  readonly recordId?: DeliveryRecordId;
}

export function requestDelivery(input: RequestDeliveryInput): DeliveryRecord {
  const { request, renderedMessageRecord, sink, now, deliveryRecordRepository } = input;
  const id = input.recordId ?? newDeliveryRecordId();

  const persistAndReturn = (state: Parameters<typeof DeliveryRecord.create>[0]): DeliveryRecord => {
    const record = DeliveryRecord.create(state);
    deliveryRecordRepository.save(record);
    return record;
  };

  // 1. Record missing → not-attempted; sink not called.
  if (renderedMessageRecord === undefined) {
    const eligibility: DeliveryEligibilityCheck = Object.freeze({
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      eligible: false,
      eligibility: Object.freeze({
        eligible: false,
        reasons: Object.freeze(["rendered-message-not-found"]),
        recordRef: request.renderedMessageRecordRef,
        currentReviewStatus: "not-reviewed" as const,
      }),
      reasons: Object.freeze(["rendered-message-not-found"]),
      checkedAt: now,
    });
    return persistAndReturn({
      id,
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      target: request.target,
      request,
      eligibility,
      outcome: "not-attempted",
      failureReason: "rendered-message-not-found",
      requestedAt: request.requestedAt,
    });
  }

  // 2. Compute eligibility from rendering (the single source of truth) — verify, never reinterpret.
  const displayEligibility = displayEligibilityOf(renderedMessageRecord);
  const eligibility = deliveryEligibilityCheck({ eligibility: displayEligibility, checkedAt: now });

  // 3. Not eligible → blocked; sink not called; specific failure reason preserved.
  if (!eligibility.eligible) {
    return persistAndReturn({
      id,
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      target: request.target,
      request,
      eligibility,
      outcome: "blocked-not-eligible",
      failureReason: primaryFailureReasonFor(displayEligibility) ?? "not-display-eligible",
      requestedAt: request.requestedAt,
    });
  }

  // 4. Eligible but target unsupported/reserved → blocked; sink not called.
  if (!isSupportedTarget(request.target)) {
    return persistAndReturn({
      id,
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      target: request.target,
      request,
      eligibility,
      outcome: "blocked-not-eligible",
      failureReason: "unsupported-channel",
      requestedAt: request.requestedAt,
    });
  }

  // 5. Eligible + supported test target → call the deterministic test sink.
  const text = renderedMessageRecord.text ?? "";
  const result = sink.deliver({
    recordRef: eligibility.renderedMessageRecordRef,
    target: request.target,
    text,
  });

  if (result.status === "delivered") {
    return persistAndReturn({
      id,
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      target: request.target,
      request,
      eligibility,
      outcome: "delivered",
      sinkKind: sink.kind,
      requestedAt: request.requestedAt,
      attemptedAt: now,
      completedAt: now,
    });
  }
  if (result.status === "failed") {
    return persistAndReturn({
      id,
      renderedMessageRecordRef: request.renderedMessageRecordRef,
      target: request.target,
      request,
      eligibility,
      outcome: "failed",
      failureReason: "sink-unavailable",
      sinkKind: sink.kind,
      requestedAt: request.requestedAt,
      attemptedAt: now,
    });
  }
  // cancelled
  return persistAndReturn({
    id,
    renderedMessageRecordRef: request.renderedMessageRecordRef,
    target: request.target,
    request,
    eligibility,
    outcome: "cancelled",
    failureReason: "delivery-cancelled",
    sinkKind: sink.kind,
    requestedAt: request.requestedAt,
    attemptedAt: now,
  });
}

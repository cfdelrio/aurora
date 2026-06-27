// delivery domain: public surface.

// Re-export the rendering id type module-locally so the repository-named files (constrained by the
// persistence-boundary guard to import only own module + shared-kernel) can reference it without reaching
// into rendering directly. The read-only rendering dependency itself lives in the domain/service layer.
export type { RenderedMessageRecordId } from "../../rendering/index.ts";

export { deliveryRequestId, newDeliveryRequestId, deliveryRecordId, newDeliveryRecordId } from "./ids.ts";
export type { DeliveryRequestId, DeliveryRecordId } from "./ids.ts";

export {
  DELIVERY_TARGETS,
  SUPPORTED_TARGETS,
  RESERVED_TARGETS,
  isDeliveryTarget,
  isSupportedTarget,
} from "./delivery-target.ts";
export type { DeliveryTarget } from "./delivery-target.ts";

export { DELIVERY_OUTCOMES, isDeliveryOutcome } from "./delivery-outcome.ts";
export type { DeliveryOutcome } from "./delivery-outcome.ts";

export { DELIVERY_FAILURE_REASONS, isDeliveryFailureReason } from "./delivery-failure.ts";
export type { DeliveryFailureReason } from "./delivery-failure.ts";

export { deliveryRequest } from "./delivery-request.ts";
export type { DeliveryRequest, RequesterKind } from "./delivery-request.ts";

export { deliveryEligibilityCheck, primaryFailureReasonFor } from "./delivery-eligibility-check.ts";
export type { DeliveryEligibilityCheck } from "./delivery-eligibility-check.ts";

export { InMemoryTestSink } from "./delivery-sink.ts";
export type { DeliverySink, DeliverInput, SinkResult, TestSinkBehavior } from "./delivery-sink.ts";

export { DeliveryRecord } from "./delivery-record.ts";
export type { DeliveryRecordState } from "./delivery-record.ts";

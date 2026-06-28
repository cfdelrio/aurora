// delivery domain: DeliveryRecord — an auditable record of a delivery attempt/exposure. It is AUDITABILITY,
// NOT AUTHORITY: it carries no Evidence/Observation/Understanding/AthleteDecision field, no DecisionSupport
// mutation handle, no channel secret, no provider payload, and no arbitrary metadata bag. Built only through
// validated `create`/`reconstitute`; immutable (Object.freeze).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { RenderedMessageRecordId } from "../../rendering/index.ts";
import type { DeliveryRecordId } from "./ids.ts";
import { isDeliveryTarget } from "./delivery-target.ts";
import type { DeliveryTarget } from "./delivery-target.ts";
import { isDeliveryOutcome } from "./delivery-outcome.ts";
import type { DeliveryOutcome } from "./delivery-outcome.ts";
import { isDeliveryFailureReason } from "./delivery-failure.ts";
import type { DeliveryFailureReason } from "./delivery-failure.ts";
import type { DeliveryRequest } from "./delivery-request.ts";
import type { DeliveryEligibilityCheck } from "./delivery-eligibility-check.ts";

export interface DeliveryRecordState {
  readonly id: DeliveryRecordId;
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  readonly request: DeliveryRequest;
  readonly eligibility: DeliveryEligibilityCheck;
  readonly outcome: DeliveryOutcome;
  readonly failureReason?: DeliveryFailureReason; // present iff blocked/failed/cancelled/not-attempted
  readonly sinkKind?: string; // present iff the sink was called (attemptedAt present)
  readonly requestedAt: Timestamp;
  readonly attemptedAt?: Timestamp; // present iff the sink was called
  readonly completedAt?: Timestamp; // present iff outcome === "delivered"
}

const FAILURE_OUTCOMES: readonly DeliveryOutcome[] = ["blocked-not-eligible", "failed", "cancelled", "not-attempted"];

function validTimestamp(t: unknown): t is Timestamp {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof (t as Timestamp).epochMillis === "number" &&
    Number.isFinite((t as Timestamp).epochMillis) &&
    typeof (t as Timestamp).iso === "string"
  );
}

function validate(state: DeliveryRecordState): void {
  if (typeof state.id !== "string" || String(state.id).length === 0) {
    throw new Error("DeliveryRecord requires an id");
  }
  if (
    typeof state.renderedMessageRecordRef !== "string" ||
    String(state.renderedMessageRecordRef).length === 0
  ) {
    throw new Error("DeliveryRecord requires a renderedMessageRecordRef");
  }
  if (!isDeliveryTarget(state.target)) {
    throw new Error(`DeliveryRecord.target is not a known DeliveryTarget: ${String(state.target)}`);
  }
  if (!isDeliveryOutcome(state.outcome)) {
    throw new Error(`DeliveryRecord.outcome is not a known DeliveryOutcome: ${String(state.outcome)}`);
  }
  if (state.failureReason !== undefined && !isDeliveryFailureReason(state.failureReason)) {
    throw new Error(`DeliveryRecord.failureReason is not a known DeliveryFailureReason: ${String(state.failureReason)}`);
  }
  if (state.request === undefined || state.request === null) {
    throw new Error("DeliveryRecord requires a request");
  }
  if (state.request.target !== state.target) {
    throw new Error("DeliveryRecord.target must match request.target");
  }
  if (state.eligibility === undefined || state.eligibility === null) {
    throw new Error("DeliveryRecord requires an eligibility check");
  }
  if (!validTimestamp(state.requestedAt)) {
    throw new Error("DeliveryRecord requires a valid requestedAt timestamp");
  }

  // Outcome ↔ failureReason coherence.
  if (state.outcome === "delivered" || state.outcome === "accepted-for-delivery") {
    if (state.failureReason !== undefined) {
      throw new Error(`DeliveryRecord with outcome '${state.outcome}' must not carry a failureReason`);
    }
  } else if (FAILURE_OUTCOMES.includes(state.outcome)) {
    if (state.failureReason === undefined) {
      throw new Error(`DeliveryRecord with outcome '${state.outcome}' requires a failureReason`);
    }
  }
  if (state.outcome === "not-attempted" && state.failureReason !== "rendered-message-not-found") {
    throw new Error("not-attempted requires failureReason 'rendered-message-not-found'");
  }
  if (state.outcome === "failed" && state.failureReason !== "sink-unavailable") {
    throw new Error("failed requires failureReason 'sink-unavailable'");
  }
  if (state.outcome === "cancelled" && state.failureReason !== "delivery-cancelled") {
    throw new Error("cancelled requires failureReason 'delivery-cancelled'");
  }

  // Attempt/completion timestamps must match the outcome (sink-called vs not).
  if (state.attemptedAt !== undefined && !validTimestamp(state.attemptedAt)) {
    throw new Error("DeliveryRecord.attemptedAt, when present, must be a valid timestamp");
  }
  if (state.completedAt !== undefined && !validTimestamp(state.completedAt)) {
    throw new Error("DeliveryRecord.completedAt, when present, must be a valid timestamp");
  }
  if (state.outcome === "delivered") {
    if (state.attemptedAt === undefined || state.completedAt === undefined) {
      throw new Error("delivered requires both attemptedAt and completedAt");
    }
  }
  if ((state.outcome === "failed" || state.outcome === "cancelled") && state.attemptedAt === undefined) {
    throw new Error(`${state.outcome} requires an attemptedAt (the sink was called)`);
  }
  if (state.outcome === "blocked-not-eligible" || state.outcome === "not-attempted") {
    if (state.attemptedAt !== undefined) {
      throw new Error(`${state.outcome} must not have an attemptedAt (the sink is never called)`);
    }
    if (state.completedAt !== undefined) {
      throw new Error(`${state.outcome} must not have a completedAt`);
    }
  }
  if (state.outcome !== "delivered" && state.completedAt !== undefined) {
    throw new Error("completedAt is only valid for a delivered outcome");
  }
  // sinkKind is present iff the sink was called (attemptedAt present).
  if ((state.sinkKind !== undefined) !== (state.attemptedAt !== undefined)) {
    throw new Error("DeliveryRecord.sinkKind must be present iff attemptedAt is present");
  }
}

export class DeliveryRecord {
  readonly id: DeliveryRecordId;
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  readonly request: DeliveryRequest;
  readonly eligibility: DeliveryEligibilityCheck;
  readonly outcome: DeliveryOutcome;
  readonly failureReason?: DeliveryFailureReason;
  readonly sinkKind?: string;
  readonly requestedAt: Timestamp;
  readonly attemptedAt?: Timestamp;
  readonly completedAt?: Timestamp;

  private constructor(state: DeliveryRecordState) {
    this.id = state.id;
    this.renderedMessageRecordRef = state.renderedMessageRecordRef;
    this.target = state.target;
    this.request = state.request;
    this.eligibility = state.eligibility;
    this.outcome = state.outcome;
    if (state.failureReason !== undefined) this.failureReason = state.failureReason;
    if (state.sinkKind !== undefined) this.sinkKind = state.sinkKind;
    this.requestedAt = state.requestedAt;
    if (state.attemptedAt !== undefined) this.attemptedAt = state.attemptedAt;
    if (state.completedAt !== undefined) this.completedAt = state.completedAt;
    Object.freeze(this);
  }

  /** The only builder. Validates the full audit invariant set (§7). */
  static create(state: DeliveryRecordState): DeliveryRecord {
    validate(state);
    return new DeliveryRecord(state);
  }

  toState(): DeliveryRecordState {
    return Object.freeze({
      id: this.id,
      renderedMessageRecordRef: this.renderedMessageRecordRef,
      target: this.target,
      request: this.request,
      eligibility: this.eligibility,
      outcome: this.outcome,
      ...(this.failureReason !== undefined ? { failureReason: this.failureReason } : {}),
      ...(this.sinkKind !== undefined ? { sinkKind: this.sinkKind } : {}),
      requestedAt: this.requestedAt,
      ...(this.attemptedAt !== undefined ? { attemptedAt: this.attemptedAt } : {}),
      ...(this.completedAt !== undefined ? { completedAt: this.completedAt } : {}),
    });
  }

  /** Rebuild from persisted state, re-validating every audit invariant. Invalid state is rejected. */
  static reconstitute(state: DeliveryRecordState): DeliveryRecord {
    validate(state);
    return new DeliveryRecord(state);
  }
}

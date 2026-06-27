// delivery domain: DeliveryRequest — a request to EXPOSE an existing rendered-message record to a target.
// It references what already exists; it carries no new domain claim, no voice override, no text-mutation
// instruction, no provider payload/secret, no prompt/channel injection, and no arbitrary metadata bag.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { RenderedMessageRecordId } from "../../rendering/index.ts";
import { deliveryRequestId } from "./ids.ts";
import type { DeliveryRequestId } from "./ids.ts";
import { isDeliveryTarget } from "./delivery-target.ts";
import type { DeliveryTarget } from "./delivery-target.ts";

export type RequesterKind = "system" | "human" | "test";
const REQUESTER_KINDS: readonly RequesterKind[] = ["system", "human", "test"];

export interface DeliveryRequest {
  readonly id: DeliveryRequestId;
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  readonly requestedAt: Timestamp;
  readonly requesterKind: RequesterKind;
  /** an explicit single safe note; never an arbitrary payload bag */
  readonly reason?: string;
}

function validTimestamp(t: unknown): t is Timestamp {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof (t as Timestamp).epochMillis === "number" &&
    Number.isFinite((t as Timestamp).epochMillis) &&
    typeof (t as Timestamp).iso === "string"
  );
}

/** Smart constructor: validates the closed target, the requester kind, and the refs; freezes. */
export function deliveryRequest(input: DeliveryRequest): DeliveryRequest {
  const id = deliveryRequestId(String(input.id));
  if (typeof input.renderedMessageRecordRef !== "string" || String(input.renderedMessageRecordRef).length === 0) {
    throw new Error("DeliveryRequest requires a renderedMessageRecordRef");
  }
  if (!isDeliveryTarget(input.target)) {
    throw new Error(`DeliveryRequest.target must be a known DeliveryTarget, got ${String(input.target)}`);
  }
  if (!validTimestamp(input.requestedAt)) {
    throw new Error("DeliveryRequest requires a valid requestedAt timestamp");
  }
  if (!REQUESTER_KINDS.includes(input.requesterKind)) {
    throw new Error(`DeliveryRequest.requesterKind must be system | human | test, got ${String(input.requesterKind)}`);
  }
  if (input.reason !== undefined && typeof input.reason !== "string") {
    throw new Error("DeliveryRequest.reason, when present, must be a string");
  }
  return Object.freeze({
    id,
    renderedMessageRecordRef: input.renderedMessageRecordRef,
    target: input.target,
    requestedAt: input.requestedAt,
    requesterKind: input.requesterKind,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  });
}

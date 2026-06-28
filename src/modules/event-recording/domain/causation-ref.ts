// event-recording domain: a CausationRef describes LINEAGE — what led to this record. It is
// descriptive only: it never fires execution and never implies a handler. Resolving a causation
// graph reconstructs "why this is here" and in what order; it makes nothing happen.

import { assertRefOnly, eventPayloadRef } from "./event-payload-ref.ts";
import type { EventPayloadRef } from "./event-payload-ref.ts";
import { domainEventRecordId } from "./ids.ts";
import type { DomainEventRecordId } from "./ids.ts";

export interface CausationRef {
  /** the prior record that led here */
  readonly causedByRecordId?: DomainEventRecordId;
  /** or the artifact that led here */
  readonly causedByRef?: EventPayloadRef;
}

export function causationRef(input: CausationRef): CausationRef {
  if (input === null || typeof input !== "object") {
    throw new Error("CausationRef requires at least one of causedByRecordId / causedByRef");
  }
  if (input.causedByRecordId === undefined && input.causedByRef === undefined) {
    throw new Error("CausationRef requires at least one of causedByRecordId / causedByRef");
  }
  const causedByRecordId =
    input.causedByRecordId === undefined ? undefined : domainEventRecordId(String(input.causedByRecordId));
  let causedByRef: EventPayloadRef | undefined;
  if (input.causedByRef !== undefined) {
    assertRefOnly(input.causedByRef, "causedByRef");
    causedByRef = eventPayloadRef(input.causedByRef);
  }
  return Object.freeze({
    ...(causedByRecordId !== undefined ? { causedByRecordId } : {}),
    ...(causedByRef !== undefined ? { causedByRef } : {}),
  });
}

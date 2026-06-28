// event-recording tests: small builders. Refs are built from plain literals — these tests import
// NO domain module (only this module + shared-kernel), proving event-recording is dependency-neutral.

import { timestamp } from "../../../shared-kernel/time.ts";
import {
  DomainEventRecord,
  domainEventRecordId,
  eventPayloadRef,
  traceabilityEnvelope,
} from "../index.ts";
import type { RecordDomainEventInput } from "../index.ts";

export const T = (iso: string) => timestamp(iso);

export const OCCURRED = T("2026-01-01T10:00:00.000Z");
export const RECORDED = T("2026-01-01T10:00:05.000Z");

/** A minimal valid ObservationSetRecorded input (override any field). */
export function observationSetRecordedInput(
  overrides: Partial<RecordDomainEventInput> = {},
): RecordDomainEventInput {
  return {
    id: domainEventRecordId("evt-obs-1"),
    type: "ObservationSetRecorded",
    category: "occurrence",
    occurredAt: OCCURRED,
    recordedAt: RECORDED,
    producingModule: "observation",
    traceability: traceabilityEnvelope({
      primaryArtifactRef: eventPayloadRef({ kind: "ObservationSet", id: "obsset:1", role: "subject" }),
      sourceRefs: [eventPayloadRef({ kind: "Observation", id: "obs:1" })],
    }),
    payloadRefs: [eventPayloadRef({ kind: "Observation", id: "obs:1", role: "subject" })],
    ...overrides,
  };
}

export function observationSetRecorded(overrides: Partial<RecordDomainEventInput> = {}): DomainEventRecord {
  return DomainEventRecord.record(observationSetRecordedInput(overrides));
}

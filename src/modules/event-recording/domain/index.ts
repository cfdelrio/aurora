// event-recording domain: public surface.

export { domainEventRecordId, newDomainEventRecordId } from "./ids.ts";
export type { DomainEventRecordId } from "./ids.ts";

export { DOMAIN_EVENT_CATEGORIES, isDomainEventCategory } from "./domain-event-category.ts";
export type { DomainEventCategory } from "./domain-event-category.ts";

export { PRODUCING_MODULES, isProducingModule } from "./producing-module.ts";
export type { ProducingModule } from "./producing-module.ts";

export {
  DOMAIN_EVENT_CATALOG,
  catalogEntry,
  isDomainEventType,
} from "./domain-event-type.ts";
export type { DomainEventType, DomainEventCatalogEntry } from "./domain-event-type.ts";

export {
  EVENT_ARTIFACT_KINDS,
  ALLOWED_PAYLOAD_REF_KEYS,
  assertRefOnly,
  eventPayloadRef,
  isEventArtifactKind,
} from "./event-payload-ref.ts";
export type { EventArtifactKind, EventPayloadRef } from "./event-payload-ref.ts";

export {
  PROJECTION_FRESHNESS_STATUSES,
  envelopeRefKinds,
  isProjectionFreshnessStatus,
  traceabilityEnvelope,
} from "./traceability-envelope.ts";
export type {
  ProjectionFreshnessMarker,
  ProjectionFreshnessStatus,
  TraceabilityEnvelope,
} from "./traceability-envelope.ts";

export { causationRef } from "./causation-ref.ts";
export type { CausationRef } from "./causation-ref.ts";

export { correlationRef } from "./correlation-ref.ts";
export type { CorrelationRef } from "./correlation-ref.ts";

export { eventActor } from "./event-actor.ts";
export type { EventActor } from "./event-actor.ts";

export { DomainEventRecord } from "./domain-event-record.ts";
export type { DomainEventRecordState, RecordDomainEventInput } from "./domain-event-record.ts";

export { DomainEventRecordLog } from "./domain-event-record-log.ts";
export type { DomainEventRecordLogState } from "./domain-event-record-log.ts";

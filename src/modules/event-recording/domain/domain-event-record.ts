// event-recording domain: DomainEventRecord — an append-only, ref-only record that a domain
// occurrence happened. It says "this happened"; never "therefore do this". It has NO behavior
// beyond being recorded: it executes nothing, mutates nothing, commands nothing, infers no meaning.

import { timestampLeq } from "../../../shared-kernel/time.ts";
import type { Timestamp } from "../../../shared-kernel/time.ts";

import { isDomainEventCategory } from "./domain-event-category.ts";
import type { DomainEventCategory } from "./domain-event-category.ts";
import { catalogEntry, isDomainEventType } from "./domain-event-type.ts";
import type { DomainEventType } from "./domain-event-type.ts";
import { isProducingModule } from "./producing-module.ts";
import type { ProducingModule } from "./producing-module.ts";
import { domainEventRecordId } from "./ids.ts";
import type { DomainEventRecordId } from "./ids.ts";
import { assertRefOnly, eventPayloadRef } from "./event-payload-ref.ts";
import type { EventPayloadRef } from "./event-payload-ref.ts";
import { envelopeRefKinds, traceabilityEnvelope } from "./traceability-envelope.ts";
import type { TraceabilityEnvelope } from "./traceability-envelope.ts";
import { causationRef } from "./causation-ref.ts";
import type { CausationRef } from "./causation-ref.ts";
import { correlationRef } from "./correlation-ref.ts";
import type { CorrelationRef } from "./correlation-ref.ts";
import { eventActor } from "./event-actor.ts";
import type { EventActor } from "./event-actor.ts";

export interface DomainEventRecordState {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;
  readonly payloadRefs: readonly EventPayloadRef[];
  readonly actor?: EventActor;
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;
}

export interface RecordDomainEventInput {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;
  readonly payloadRefs?: readonly EventPayloadRef[];
  readonly actor?: EventActor;
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;
}

interface DomainEventRecordProps {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;
  readonly payloadRefs: readonly EventPayloadRef[];
  readonly actor?: EventActor;
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;
}

function validTimestamp(value: unknown): value is Timestamp {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Timestamp).epochMillis === "number" &&
    Number.isFinite((value as Timestamp).epochMillis) &&
    typeof (value as Timestamp).iso === "string"
  );
}

/** Build validated, frozen props shared by record() and reconstitute(). Runs every catalog rule. */
function buildProps(input: RecordDomainEventInput): DomainEventRecordProps {
  const id = domainEventRecordId(String(input.id));

  if (!isDomainEventType(input.type)) {
    throw new Error(`DomainEventRecord.type must be in the closed catalog, got: ${String(input.type)}`);
  }
  const entry = catalogEntry(input.type);

  if (!isDomainEventCategory(input.category)) {
    throw new Error(`DomainEventRecord.category must be occurrence | outcome, got: ${String(input.category)}`);
  }
  if (input.category !== entry.category) {
    throw new Error(`DomainEventRecord type ${input.type} requires category ${entry.category}, got ${input.category}`);
  }
  if (!isProducingModule(input.producingModule)) {
    throw new Error(`DomainEventRecord.producingModule invalid: ${String(input.producingModule)}`);
  }
  if (input.producingModule !== entry.module) {
    throw new Error(`DomainEventRecord type ${input.type} belongs to module ${entry.module}, got ${input.producingModule}`);
  }

  if (!validTimestamp(input.occurredAt) || !validTimestamp(input.recordedAt)) {
    throw new Error("DomainEventRecord requires valid occurredAt and recordedAt timestamps");
  }
  if (!timestampLeq(input.occurredAt, input.recordedAt)) {
    throw new Error("DomainEventRecord.recordedAt must not be earlier than occurredAt");
  }

  if (input.traceability === undefined) {
    throw new Error("DomainEventRecord requires a traceability envelope");
  }
  // Re-run the envelope smart constructor so a reconstituted (plain) envelope is fully re-validated.
  const traceability = traceabilityEnvelope(input.traceability);

  if (traceability.primaryArtifactRef.kind !== entry.primaryKind) {
    throw new Error(
      `DomainEventRecord type ${input.type} requires primary artifact kind ${entry.primaryKind}, got ${traceability.primaryArtifactRef.kind}`,
    );
  }

  // payload refs: ref-only; validate each.
  const payloadRefs = Object.freeze(
    (input.payloadRefs ?? []).map((r, i) => {
      assertRefOnly(r, `payloadRefs[${i}]`);
      return eventPayloadRef(r);
    }),
  );

  // required refs must appear among primary + sources + typed slots + payload refs.
  const available = new Set<string>([...envelopeRefKinds(traceability), ...payloadRefs.map((r) => r.kind)]);
  for (const required of entry.requiredRefKinds) {
    if (!available.has(required)) {
      throw new Error(`DomainEventRecord type ${input.type} requires a ${required} reference`);
    }
  }

  if (entry.requiresFreshness === true && traceability.projectionFreshness === undefined) {
    throw new Error(`DomainEventRecord type ${input.type} requires a projection-freshness marker`);
  }
  if (entry.requiredPrimaryRole !== undefined) {
    const role = traceability.primaryArtifactRef.role;
    if (role === undefined || !entry.requiredPrimaryRole.includes(role)) {
      throw new Error(
        `DomainEventRecord type ${input.type} requires primary ref role in {${entry.requiredPrimaryRole.join(", ")}}`,
      );
    }
  }

  const actor = input.actor === undefined ? undefined : eventActor(input.actor);
  if (entry.requiredActorKind !== undefined) {
    if (actor === undefined || actor.kind !== entry.requiredActorKind) {
      throw new Error(`DomainEventRecord type ${input.type} requires an actor of kind ${entry.requiredActorKind}`);
    }
  }

  const causation = input.causation === undefined ? undefined : causationRef(input.causation);
  const correlation = input.correlation === undefined ? undefined : correlationRef(String(input.correlation));

  return {
    id,
    type: input.type,
    category: input.category,
    occurredAt: input.occurredAt,
    recordedAt: input.recordedAt,
    producingModule: input.producingModule,
    traceability,
    payloadRefs,
    ...(actor !== undefined ? { actor } : {}),
    ...(causation !== undefined ? { causation } : {}),
    ...(correlation !== undefined ? { correlation } : {}),
  };
}

export class DomainEventRecord {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;
  private readonly _payloadRefs: readonly EventPayloadRef[];
  readonly actor?: EventActor;
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;

  private constructor(props: DomainEventRecordProps) {
    this.id = props.id;
    this.type = props.type;
    this.category = props.category;
    this.occurredAt = props.occurredAt;
    this.recordedAt = props.recordedAt;
    this.producingModule = props.producingModule;
    this.traceability = props.traceability;
    this._payloadRefs = props.payloadRefs;
    if (props.actor !== undefined) this.actor = props.actor;
    if (props.causation !== undefined) this.causation = props.causation;
    if (props.correlation !== undefined) this.correlation = props.correlation;
    Object.freeze(this);
  }

  /** Birth path. Validates the full catalog contract. Produces a record; executes nothing. */
  static record(input: RecordDomainEventInput): DomainEventRecord {
    return new DomainEventRecord(buildProps(input));
  }

  get payloadRefs(): readonly EventPayloadRef[] {
    return this._payloadRefs;
  }

  /** Persistence state export. Plain, serializable; exposes no mutable internal reference. */
  toState(): DomainEventRecordState {
    return Object.freeze({
      id: this.id,
      type: this.type,
      category: this.category,
      occurredAt: this.occurredAt,
      recordedAt: this.recordedAt,
      producingModule: this.producingModule,
      traceability: this.traceability,
      payloadRefs: this._payloadRefs,
      ...(this.actor !== undefined ? { actor: this.actor } : {}),
      ...(this.causation !== undefined ? { causation: this.causation } : {}),
      ...(this.correlation !== undefined ? { correlation: this.correlation } : {}),
    });
  }

  /** Rebirth path. Re-validates the same catalog contract. No execution; no timestamp change. */
  static reconstitute(state: DomainEventRecordState): DomainEventRecord {
    return new DomainEventRecord(buildProps(state));
  }
}

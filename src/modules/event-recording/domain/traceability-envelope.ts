// event-recording domain: the reusable traceability envelope a record carries. It models REFS,
// never copies. It invents no traceability (only refs the caller composed from real artifacts) and
// never uses storage foreign keys as a conceptual substitute — the domain trace is the (kind, id) handles.

import { assertRefOnly, eventPayloadRef } from "./event-payload-ref.ts";
import type { EventPayloadRef } from "./event-payload-ref.ts";

/** A local copy of understanding's 5-state freshness, carried as a status LABEL (never the view). */
export type ProjectionFreshnessStatus = "current" | "stale" | "partial" | "invalid" | "unknown";

export const PROJECTION_FRESHNESS_STATUSES: readonly ProjectionFreshnessStatus[] = [
  "current",
  "stale",
  "partial",
  "invalid",
  "unknown",
];

export function isProjectionFreshnessStatus(value: unknown): value is ProjectionFreshnessStatus {
  return typeof value === "string" && (PROJECTION_FRESHNESS_STATUSES as readonly string[]).includes(value);
}

export interface ProjectionFreshnessMarker {
  readonly ref: EventPayloadRef;
  readonly status: ProjectionFreshnessStatus;
}

export interface TraceabilityEnvelope {
  readonly primaryArtifactRef: EventPayloadRef;
  readonly sourceRefs: readonly EventPayloadRef[];
  readonly purposeVersionRef?: EventPayloadRef;
  readonly hypothesisRef?: EventPayloadRef;
  readonly observationSetRef?: EventPayloadRef;
  readonly decisionSupportCaseRef?: EventPayloadRef;
  readonly athleteDecisionRef?: EventPayloadRef;
  readonly projectionFreshness?: ProjectionFreshnessMarker;
  /** short labels (e.g. "incomplete-chain"), never copied artifact content */
  readonly limitations?: readonly string[];
}

function refViaConstructor(ref: EventPayloadRef, context: string): EventPayloadRef {
  assertRefOnly(ref, context); // reject smuggled, copied-state fields
  return eventPayloadRef(ref); // re-validate kind + id, re-freeze
}

/** Smart constructor: validates every present ref is a well-formed, ref-only handle; freezes. */
export function traceabilityEnvelope(input: TraceabilityEnvelope): TraceabilityEnvelope {
  if (input === null || typeof input !== "object" || input.primaryArtifactRef === undefined) {
    throw new Error("TraceabilityEnvelope requires a primaryArtifactRef");
  }
  if (!Array.isArray(input.sourceRefs)) {
    throw new Error("TraceabilityEnvelope requires a sourceRefs array (possibly empty)");
  }
  const primary = refViaConstructor(input.primaryArtifactRef, "primaryArtifactRef");
  const sourceRefs = Object.freeze(input.sourceRefs.map((r, i) => refViaConstructor(r, `sourceRefs[${i}]`)));

  const typedSlot = (
    ref: EventPayloadRef | undefined,
    name: string,
  ): EventPayloadRef | undefined => (ref === undefined ? undefined : refViaConstructor(ref, name));

  const purposeVersionRef = typedSlot(input.purposeVersionRef, "purposeVersionRef");
  const hypothesisRef = typedSlot(input.hypothesisRef, "hypothesisRef");
  const observationSetRef = typedSlot(input.observationSetRef, "observationSetRef");
  const decisionSupportCaseRef = typedSlot(input.decisionSupportCaseRef, "decisionSupportCaseRef");
  const athleteDecisionRef = typedSlot(input.athleteDecisionRef, "athleteDecisionRef");

  let projectionFreshness: ProjectionFreshnessMarker | undefined;
  if (input.projectionFreshness !== undefined) {
    const m = input.projectionFreshness;
    if (!isProjectionFreshnessStatus(m.status)) {
      throw new Error(`projectionFreshness.status must be one of the 5 states, got: ${String(m.status)}`);
    }
    projectionFreshness = Object.freeze({ ref: refViaConstructor(m.ref, "projectionFreshness.ref"), status: m.status });
  }

  let limitations: readonly string[] | undefined;
  if (input.limitations !== undefined) {
    if (!Array.isArray(input.limitations) || input.limitations.some((l) => typeof l !== "string")) {
      throw new Error("TraceabilityEnvelope.limitations must be an array of short string labels");
    }
    limitations = Object.freeze([...input.limitations]);
  }

  return Object.freeze({
    primaryArtifactRef: primary,
    sourceRefs,
    ...(purposeVersionRef !== undefined ? { purposeVersionRef } : {}),
    ...(hypothesisRef !== undefined ? { hypothesisRef } : {}),
    ...(observationSetRef !== undefined ? { observationSetRef } : {}),
    ...(decisionSupportCaseRef !== undefined ? { decisionSupportCaseRef } : {}),
    ...(athleteDecisionRef !== undefined ? { athleteDecisionRef } : {}),
    ...(projectionFreshness !== undefined ? { projectionFreshness } : {}),
    ...(limitations !== undefined ? { limitations } : {}),
  });
}

/** All artifact-kind handles a record references (primary + sources + typed slots). For required-ref checks. */
export function envelopeRefKinds(envelope: TraceabilityEnvelope): readonly string[] {
  const refs: EventPayloadRef[] = [envelope.primaryArtifactRef, ...envelope.sourceRefs];
  for (const r of [
    envelope.purposeVersionRef,
    envelope.hypothesisRef,
    envelope.observationSetRef,
    envelope.decisionSupportCaseRef,
    envelope.athleteDecisionRef,
  ]) {
    if (r !== undefined) refs.push(r);
  }
  if (envelope.projectionFreshness !== undefined) refs.push(envelope.projectionFreshness.ref);
  return refs.map((r) => r.kind);
}

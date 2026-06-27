// event-recording domain: a minimal, ref-only payload entry. It points at another artifact by
// (kind, id) — it never copies the artifact's state. The narrow shape makes copied aggregate
// state, text bodies, decision objects, and arbitrary metadata bags *unrepresentable*.

import type { ProducingModule } from "./producing-module.ts";

/** The closed set of artifact kinds a record may reference. No infrastructure/UI/LLM kinds. */
export type EventArtifactKind =
  | "ObservationSet"
  | "Observation"
  | "Signal"
  | "SignalRejection"
  | "Hypothesis"
  | "EvidenceCase"
  | "UnderstandingProfile"
  | "UnderstandingDimension"
  | "UnderstandingAssessment"
  | "DecisionOpportunity"
  | "DecisionSupportCase"
  | "Athlete"
  | "PurposeVersion"
  | "AthleteDecision";

export const EVENT_ARTIFACT_KINDS: readonly EventArtifactKind[] = [
  "ObservationSet",
  "Observation",
  "Signal",
  "SignalRejection",
  "Hypothesis",
  "EvidenceCase",
  "UnderstandingProfile",
  "UnderstandingDimension",
  "UnderstandingAssessment",
  "DecisionOpportunity",
  "DecisionSupportCase",
  "Athlete",
  "PurposeVersion",
  "AthleteDecision",
];

export function isEventArtifactKind(value: unknown): value is EventArtifactKind {
  return typeof value === "string" && (EVENT_ARTIFACT_KINDS as readonly string[]).includes(value);
}

/** The ONLY fields a payload ref may carry. There is no `payload`, `data`, or `metadata` field. */
export interface EventPayloadRef {
  readonly kind: EventArtifactKind;
  readonly id: string;
  /** the ref's role in this occurrence, e.g. "subject" | "supersedes" | "amends" | "cause" | "evidence" | a terminal-output kind */
  readonly role?: string;
  readonly ownerModule?: ProducingModule;
}

/** The set of keys a ref-only payload entry is allowed to have (guards reconstitution against smuggled state). */
export const ALLOWED_PAYLOAD_REF_KEYS: readonly string[] = ["kind", "id", "role", "ownerModule"];

/** Smart constructor. Validates the closed kind + non-empty id; freezes; carries nothing else. */
export function eventPayloadRef(input: EventPayloadRef): EventPayloadRef {
  if (input === null || typeof input !== "object") {
    throw new Error("EventPayloadRef requires a kind and an id");
  }
  if (!isEventArtifactKind(input.kind)) {
    throw new Error(`EventPayloadRef.kind must be a known EventArtifactKind, got: ${String(input.kind)}`);
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("EventPayloadRef requires a non-empty id");
  }
  if (input.role !== undefined && (typeof input.role !== "string" || input.role.length === 0)) {
    throw new Error("EventPayloadRef.role, when present, must be a non-empty string");
  }
  return Object.freeze({
    kind: input.kind,
    id: input.id,
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.ownerModule !== undefined ? { ownerModule: input.ownerModule } : {}),
  });
}

/** Reject any ref-shaped object that carries keys beyond the allowed ref-only set (no copied state). */
export function assertRefOnly(ref: unknown, context: string): asserts ref is EventPayloadRef {
  if (ref === null || typeof ref !== "object") {
    throw new Error(`${context}: payload ref must be an object`);
  }
  for (const key of Object.keys(ref as Record<string, unknown>)) {
    if (!(ALLOWED_PAYLOAD_REF_KEYS as readonly string[]).includes(key)) {
      throw new Error(`${context}: payload is ref-only; forbidden field "${key}" (no copied state)`);
    }
  }
}

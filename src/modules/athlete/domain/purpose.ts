// athlete domain: Purpose — a declared orientation that constrains interpretation.
//
// NEGATIVE CAPABILITY: a Purpose has NO field for readiness, capacity, current state, fatigue, or a
// hidden system objective. Those are *inferred* and live outside Athlete (Athlete Aggregate, the
// governing idea). Purpose is *given* — declared or accepted by the athlete — never inferred.

import type { Timestamp } from "../../../shared-kernel/time.ts";

/** Mirrors the decision-support PurposeStatus vocabulary (kept local; no cross-import). */
export type PurposeStatus = "declared" | "unknown" | "ambiguous";

/** A purpose only exists if the athlete declared or accepted it. There is no inferred/system source. */
export type PurposeSource = "athlete-declared" | "athlete-accepted";

/** Why a purpose changed, when known. Optional — never implies Aurora chose the change. */
export type PurposeChangeReason =
  | "new-goal"
  | "injury"
  | "life-change"
  | "exploration"
  | "clarification"
  | "unspecified";

export interface Purpose {
  readonly status: PurposeStatus;
  /** required iff declared; optional for an explicitly ambiguous purpose */
  readonly statement?: string;
  readonly source: PurposeSource;
  readonly effectiveAt: Timestamp;
  readonly rationale?: string;
  readonly ambiguityNote?: string;
}

/** The athlete-sourced declaration input. It originates from the athlete, never from behavior. */
export interface DeclaredPurpose {
  readonly statement: string;
  readonly source: PurposeSource;
  readonly effectiveAt: Timestamp;
  readonly rationale?: string;
}

const SOURCES: readonly PurposeSource[] = ["athlete-declared", "athlete-accepted"];

function requireAthleteSource(source: PurposeSource): PurposeSource {
  if (!SOURCES.includes(source)) {
    throw new Error("Purpose requires an athlete source (declared or accepted); inference is forbidden");
  }
  return source;
}

/** A declared (current) purpose. Requires a non-empty statement and an athlete source. */
export function purpose(input: DeclaredPurpose): Purpose {
  if (typeof input.statement !== "string" || input.statement.length === 0) {
    throw new Error("A declared Purpose requires a non-empty statement");
  }
  const base = {
    status: "declared" as const,
    statement: input.statement,
    source: requireAthleteSource(input.source),
    effectiveAt: input.effectiveAt,
  };
  return Object.freeze(
    input.rationale === undefined ? base : { ...base, rationale: input.rationale },
  );
}

export interface AmbiguousPurposeInput {
  readonly source: PurposeSource;
  readonly effectiveAt: Timestamp;
  readonly ambiguityNote: string;
  /** an athlete may name candidate directions while remaining unsure */
  readonly statement?: string;
  readonly rationale?: string;
}

/** An explicitly ambiguous purpose: first-class, athlete-sourced, not a guess Aurora made. */
export function ambiguousPurpose(input: AmbiguousPurposeInput): Purpose {
  if (typeof input.ambiguityNote !== "string" || input.ambiguityNote.length === 0) {
    throw new Error("An ambiguous Purpose requires an ambiguityNote");
  }
  const base = {
    status: "ambiguous" as const,
    source: requireAthleteSource(input.source),
    effectiveAt: input.effectiveAt,
    ambiguityNote: input.ambiguityNote,
  };
  return Object.freeze({
    ...base,
    ...(input.statement !== undefined ? { statement: input.statement } : {}),
    ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
  });
}

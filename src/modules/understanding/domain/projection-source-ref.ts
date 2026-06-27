// understanding domain: ProjectionSourceRef / ProjectionTrace — references to the artifacts a
// projection was derived from. References, never copies: a projection points back to the truth, it
// does not embed and re-author it. Projection metadata must not INVENT traceability.

export type ProjectionSourceKind =
  | "hypothesis"
  | "evidence"
  | "signal"
  | "observation-set"
  | "observation"
  | "understanding-profile"
  | "purpose-version"
  | "provenance";

export interface ProjectionSourceRef {
  readonly kind: ProjectionSourceKind;
  readonly id: string;
}

export function projectionSourceRef(kind: ProjectionSourceKind, id: string): ProjectionSourceRef {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("A ProjectionSourceRef requires a non-empty source id");
  }
  return Object.freeze({ kind, id });
}

export interface ProjectionTrace {
  readonly refs: readonly ProjectionSourceRef[];
}

export function projectionTrace(refs: readonly ProjectionSourceRef[]): ProjectionTrace {
  return Object.freeze({ refs: Object.freeze([...refs]) });
}

/** Does this trace reference a source of the given kind and id? (selectivity check). */
export function traceReferences(
  trace: ProjectionTrace,
  kind: ProjectionSourceKind,
  id: string,
): boolean {
  return trace.refs.some((r) => r.kind === kind && r.id === id);
}

export interface ProjectionLimitations {
  readonly notes: readonly string[];
}

export function projectionLimitations(notes: readonly string[] = []): ProjectionLimitations {
  return Object.freeze({ notes: Object.freeze([...notes]) });
}

// athlete domain: the FIRST representation of a purpose reinterpretation verdict.
//
// This slice ships the STATUS TYPE + a tiny value constructor only -- NOT an engine that decides
// the status, and NOT a pipeline. A result REFERENCES the hypothesis and both purpose versions;
// it never mutates a hypothesis. Deciding which status a hypothesis gets (and how deep to walk) is
// deferred to a later spec, once reasoning becomes purpose-version-aware.

import type { PurposeVersionRef } from "./purpose-version.ts";

export type PurposeReinterpretationStatus =
  | "unchanged"
  | "limited"
  | "stale"
  | "needs-new-hypothesis"
  | "needs-inquiry"
  | "not-relevant-under-current-purpose";

export interface PurposeReinterpretationResult {
  /** an opaque handle to the hypothesis being reinterpreted (not the hypothesis itself) */
  readonly hypothesisRef: string;
  readonly fromPurposeRef: PurposeVersionRef;
  readonly toPurposeRef: PurposeVersionRef;
  readonly status: PurposeReinterpretationStatus;
  readonly note?: string;
}

export interface PurposeReinterpretationResultInput {
  readonly hypothesisRef: string;
  readonly fromPurposeRef: PurposeVersionRef;
  readonly toPurposeRef: PurposeVersionRef;
  readonly status: PurposeReinterpretationStatus;
  readonly note?: string;
}

export function purposeReinterpretationResult(
  input: PurposeReinterpretationResultInput,
): PurposeReinterpretationResult {
  if (typeof input.hypothesisRef !== "string" || input.hypothesisRef.length === 0) {
    throw new Error("A reinterpretation result must reference a hypothesis");
  }
  const base = {
    hypothesisRef: input.hypothesisRef,
    fromPurposeRef: input.fromPurposeRef,
    toPurposeRef: input.toPurposeRef,
    status: input.status,
  };
  return Object.freeze(input.note === undefined ? base : { ...base, note: input.note });
}

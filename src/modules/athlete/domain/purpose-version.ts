// athlete domain: PurposeVersion (immutable entry in the purpose timeline) + PurposeVersionRef.
//
// A PurposeVersion is created only by the Athlete aggregate when a purpose is declared or changed.
// It is immutable and never edited after creation. PurposeVersionRef is a stable handle other
// modules (e.g. reasoning's Hypothesis.purposeContextRef) can carry without copying the value.

import type { PurposeVersionId } from "./ids.ts";
import type { Purpose, PurposeChangeReason } from "./purpose.ts";

declare const purposeVersionRefBrand: unique symbol;
/** Opaque handle to a PurposeVersion; resolvable to a past version, never a copy of the value. */
export type PurposeVersionRef = string & { readonly [purposeVersionRefBrand]: true };

export interface PurposeVersion {
  readonly id: PurposeVersionId;
  readonly purpose: Purpose;
  /** 1-based, strictly increasing within a PurposeHistory */
  readonly version: number;
  readonly reason?: PurposeChangeReason;
  /** the version this one supersedes (undefined for the first) */
  readonly supersedesRef?: PurposeVersionRef;
}

export interface CreatePurposeVersionInput {
  readonly id: PurposeVersionId;
  readonly purpose: Purpose;
  readonly version: number;
  readonly reason?: PurposeChangeReason;
  readonly supersedesRef?: PurposeVersionRef;
}

export function purposeVersion(input: CreatePurposeVersionInput): PurposeVersion {
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error("PurposeVersion.version must be a positive integer");
  }
  const base = {
    id: input.id,
    purpose: input.purpose,
    version: input.version,
  };
  return Object.freeze({
    ...base,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.supersedesRef !== undefined ? { supersedesRef: input.supersedesRef } : {}),
  });
}

/** The stable handle for a version (derived from its id; never the purpose value itself). */
export function purposeVersionRefOf(v: PurposeVersion): PurposeVersionRef {
  return String(v.id) as PurposeVersionRef;
}

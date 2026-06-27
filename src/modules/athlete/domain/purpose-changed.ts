// athlete domain: PurposeChanged — the domain outcome of a purpose change.
//
// It is a returned/derivable VALUE (no event bus). It RECORDS the previous and new versions, the
// time, source, and reason. It must NOT rewrite prior reasoning, auto-falsify hypotheses, infer
// athlete state, or generate a recommendation. Downstream effects (staleness, gating) are applied
// by an application/harness layer that consumes this value — never by Athlete itself.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { PurposeChangeReason, PurposeSource } from "./purpose.ts";
import type { PurposeVersion, PurposeVersionRef } from "./purpose-version.ts";
import { purposeVersionRefOf } from "./purpose-version.ts";

export interface PurposeChanged {
  readonly previousRef: PurposeVersionRef;
  readonly newRef: PurposeVersionRef;
  readonly previousVersion: number;
  readonly newVersion: number;
  readonly at: Timestamp;
  readonly source: PurposeSource;
  readonly reason?: PurposeChangeReason;
}

/** Derive the change outcome between two adjacent versions. Pure; never mutates either version. */
export function purposeChanged(previous: PurposeVersion, next: PurposeVersion): PurposeChanged {
  const base = {
    previousRef: purposeVersionRefOf(previous),
    newRef: purposeVersionRefOf(next),
    previousVersion: previous.version,
    newVersion: next.version,
    at: next.purpose.effectiveAt,
    source: next.purpose.source,
  };
  return Object.freeze(next.reason === undefined ? base : { ...base, reason: next.reason });
}

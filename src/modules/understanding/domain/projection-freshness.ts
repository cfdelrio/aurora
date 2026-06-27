// understanding domain: ProjectionFreshness — the usability state of a derived projection.
//
// A projection is a derived VIEW, never a source of truth. Freshness makes "is this still safe to
// consume?" explicit. The safety asymmetry holds: a non-`current` status can only CONSTRAIN
// downstream use (lower the voice), never enable more. `current` is the only fully enabling state.

import type { Timestamp } from "../../../shared-kernel/time.ts";

/** Why a projection is constrained. A non-`current` freshness always names at least one reason. */
export type StalenessReason =
  | "purpose-change"
  | "hypothesis-revised"
  | "hypothesis-falsified"
  | "observation-superseded"
  | "source-quality-changed"
  | "new-contradictory-evidence"
  | "time-decay"
  | "context-changed"
  | "missing-source"
  | "projection-source-unavailable";

/**
 * Five states, ordered by safety:
 *  - `current`  — sources known, no freshness-limiting trigger active; fully enabling.
 *  - `stale`    — a source changed or recency lapsed; consume only with caution/degradation.
 *  - `partial`  — some required/confidence-supporting source missing or degraded; usable, limited.
 *  - `invalid`  — a depended-on source was contradicted/falsified/removed; not for assertive output.
 *  - `unknown`  — freshness cannot be established; treated as not-current.
 */
export type ProjectionFreshnessStatus = "current" | "stale" | "partial" | "invalid" | "unknown";

export interface ProjectionFreshness {
  readonly status: ProjectionFreshnessStatus;
  readonly reasons: readonly StalenessReason[];
  readonly since?: Timestamp;
}

export function currentFreshness(): ProjectionFreshness {
  return Object.freeze({ status: "current", reasons: Object.freeze([]) });
}

export function projectionFreshness(
  status: ProjectionFreshnessStatus,
  reasons: readonly StalenessReason[] = [],
  since?: Timestamp,
): ProjectionFreshness {
  if (status !== "current" && reasons.length === 0) {
    throw new Error(`A non-current ProjectionFreshness ('${status}') must name at least one reason`);
  }
  const base = { status, reasons: Object.freeze([...reasons]) };
  return Object.freeze(since === undefined ? base : { ...base, since });
}

/** `current` is the only fully enabling status; everything else constrains downstream use. */
export function isFullyEnabling(freshness: ProjectionFreshness): boolean {
  return freshness.status === "current";
}

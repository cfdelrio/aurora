// Implementation 012 — reprojection harness TYPES (neutral test-support; NOT a production module).
//
// A reprojection run RECOMPUTES derived views and REPORTS drift/freshness/findings. It never mutates
// an aggregate, never replays events as commands, never makes a projection current by assertion.
// These types live under __tests__/ on purpose: reprojection crosses repositories, event records, and
// multiple domain modules, and no production application layer exists yet (Tech Spec 012A, Decision 1).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { EventPayloadRef, DomainEventRecord, DomainEventRecordId } from "../../event-recording/index.ts";
import type {
  UnderstandingAssessment,
  UnderstandingProfile,
  UnderstandingProfileId,
  ProjectionFreshness,
  ProjectionSourceRef,
} from "../../understanding/index.ts";

/** Only `check-only` is implemented in this slice; the others are reserved and throw (Decision 3/6). */
export type ReprojectionMode = "check-only" | "refresh-derived" | "mark-stale";
export const REPROJECTION_MODES: readonly ReprojectionMode[] = ["check-only", "refresh-derived", "mark-stale"];

/** Closed finding set (Spec 012 §5.6). No arbitrary strings. */
export type ReprojectionFinding =
  | "unchanged"
  | "changed"
  | "stale"
  | "partial"
  | "invalid"
  | "missing-source"
  | "missing-traceability"
  | "source-superseded"
  | "event-record-only"
  | "requires-policy-transition"
  | "manual-review-required";

export const REPROJECTION_FINDINGS: readonly ReprojectionFinding[] = [
  "unchanged",
  "changed",
  "stale",
  "partial",
  "invalid",
  "missing-source",
  "missing-traceability",
  "source-superseded",
  "event-record-only",
  "requires-policy-transition",
  "manual-review-required",
];

export type TraceabilityStatus = "verified" | "incomplete" | "missing";

/** Diagnostic label for an operator/future coordinator — NEVER athlete-facing copy, never a recommendation. */
export type SafeActionCategory = "none" | "constrain-voice" | "requires-policy-transition" | "manual-review";

/** First real targets: UnderstandingAssessment + its freshness. The rest are reserved (not implemented). */
export type ReprojectionTargetKind =
  | "UnderstandingAssessment"
  | "ProjectionFreshness"
  | "ImpactAssessment" // reserved
  | "AthleteReadModel"; // reserved

export interface ReprojectionTarget {
  readonly kind: ReprojectionTargetKind;
  /** the aggregate/projection this target derives from (e.g. an UnderstandingProfile ref) */
  readonly primaryRef: EventPayloadRef;
  /** the dimension key, for UnderstandingAssessment/ProjectionFreshness targets */
  readonly dimensionKey?: string;
}

declare const reprojectionRunIdBrand: unique symbol;
export type ReprojectionRunId = string & { readonly [reprojectionRunIdBrand]: true };
export function reprojectionRunId(value: string): ReprojectionRunId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("ReprojectionRunId requires a non-empty string");
  }
  return value as ReprojectionRunId;
}

export interface ExistingView {
  readonly target: ReprojectionTarget;
  readonly view: UnderstandingAssessment;
}

export interface ReprojectionInputSet {
  /** defaults to "check-only" when omitted */
  readonly mode?: ReprojectionMode;
  readonly runId: ReprojectionRunId;
  readonly startedAt: Timestamp;
  readonly completedAt?: Timestamp;
  /** explicit + traceable; no implicit global scan */
  readonly requestedTargets: readonly ReprojectionTarget[];
  /** read-only access to current aggregate state (Impl 010 port); the harness never calls save */
  readonly understandingProfiles?: UnderstandingProfileReadAccess;
  /** occurrence history for candidate detection + context; never replayed/executed */
  readonly events?: readonly DomainEventRecord[];
  /** existing stored/current derived views, for drift comparison */
  readonly existingViews?: readonly ExistingView[];
  /** stamp for recomputed derivedAt (passed in; no Date.now()) */
  readonly at?: Timestamp;
}

/** The narrow READ surface the harness uses — it can never reach a write method through this type. */
export interface UnderstandingProfileReadAccess {
  findById(id: UnderstandingProfileId): UnderstandingProfile | undefined;
}

export interface ReprojectionResult {
  readonly target: ReprojectionTarget;
  readonly recomputed?: UnderstandingAssessment;
  readonly freshness?: ProjectionFreshness;
  readonly sourceRefs: readonly ProjectionSourceRef[];
  readonly traceability: TraceabilityStatus;
  readonly differences?: readonly string[];
  readonly findings: readonly ReprojectionFinding[];
  readonly limitations: readonly string[];
  readonly safeAction: SafeActionCategory;
}

export interface ReprojectionRun {
  readonly runId: ReprojectionRunId;
  readonly mode: ReprojectionMode;
  readonly startedAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly requestedTargets: readonly ReprojectionTarget[];
  readonly inputRefs: readonly EventPayloadRef[];
  readonly eventsConsidered: readonly DomainEventRecordId[];
  readonly sourcesConsidered: readonly EventPayloadRef[];
  readonly results: readonly ReprojectionResult[];
  readonly findings: readonly ReprojectionFinding[];
  readonly limitations: readonly string[];
  readonly errors: readonly string[];
}
